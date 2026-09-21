const SteamUser = require('steam-user');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { Dota2User } = require('dota2-user');
const { EDOTAGCMsg } = require('dota2-user/protobufs');
const protobufs = require('dota2-user/protobufs');
const { RANKS } = require('./config');
const logger = require('./logger');

const TIMEOUT_MS = 45000;

function checkAccount(login, password, proxyUrl, onGuardRequired, onStatusUpdate) {
  return new Promise((resolve, reject) => {
    const options = {};
    if (proxyUrl) {
      options.agent = new SocksProxyAgent(proxyUrl);
    }

    const client = new SteamUser(options);
    let dota = null;

    try {
      dota = new Dota2User(client);

      client.on('receivedFromGC', (appid, msgType, payload) => {
        if (appid !== 570) return;

        // k_EMsgGCClientWelcome = 4004
        if (msgType === 4004) {
          try {
            const welcome = protobufs.CMsgClientWelcome.decode(payload);

            const checkCache = (caches) => {
              if (!caches) return;
              for (const cache of caches) {
                if (!cache.objects) continue;
                for (const obj of cache.objects) {
                  if (obj.typeId === 2004) {
                    for (const data of obj.objectData) {
                      try {
                        const accountData = protobufs.CSODOTAGameAccountClient.decode(data);
                        if (accountData.lowPriorityGamesRemaining !== undefined) {
                          client.lastLowPriorityGames = accountData.lowPriorityGamesRemaining;
                        }
                        if (accountData.matchDisabledUntilDate !== undefined) {
                          client.lastMatchDisabledUntil = accountData.matchDisabledUntilDate;
                        }
                        if (accountData.playerBehaviorScoreLastReport !== undefined) {
                          client.lastBehaviorScore = accountData.playerBehaviorScoreLastReport;
                        }
                      } catch {
                        // ignore decode errors for unrelated objects
                      }
                    }
                  }

                  if (obj.typeId === 1) {
                    let ddtCount = 0;
                    for (const data of obj.objectData) {
                      try {
                        const item = protobufs.CSOEconItem.decode(data);
                        if (item.defIndex === 17660) ddtCount++;
                      } catch {
                        // ignore
                      }
                    }
                    if (ddtCount > 0) {
                      client.doubleDownTokens = (client.doubleDownTokens || 0) + ddtCount;
                    }
                  }
                }
              }
            };

            checkCache(welcome.outofdateSubscribedCaches);
            checkCache(welcome.uptodateSubscribedCaches);
          } catch (e) {
            logger.warn('Failed to parse GC Welcome', { error: e.message });
          }
        }
      });
    } catch (e) {
      return reject(new Error('Dota 2 Client Init Failed: ' + e.message));
    }

    let isResolved = false;

    const cleanup = () => {
      clearTimeout(timeout);
      client.removeAllListeners();
      dota.removeAllListeners();
      try {
        client.logOff();
      } catch {
        // ignore
      }
    };

    const safeResolve = (data) => {
      if (isResolved) return;
      isResolved = true;
      resolve(data);
      cleanup();
    };

    const safeReject = (err) => {
      if (isResolved) return;
      isResolved = true;
      reject(err);
      cleanup();
    };

    const timeout = setTimeout(() => {
      safeReject(new Error('Timeout: Operation took too long.'));
    }, TIMEOUT_MS);

    client.on('loggedOn', () => {
      onStatusUpdate('Logged into Steam. Launching Dota 2...');
      client.setPersona(SteamUser.EPersonaState.Online);
      client.gamesPlayed([570]);
    });

    client.on('steamGuard', (domain, callback, lastCodeWrong) => {
      if (lastCodeWrong) {
        onStatusUpdate('Incorrect Steam Guard code.');
      }
      onGuardRequired(domain, callback, lastCodeWrong);
    });

    client.on('error', (err) => {
      safeReject(err);
    });

    dota.on('connectedToGC', async () => {
      onStatusUpdate('Connected to Game Coordinator. Fetching data...');

      try {
        const accountId = client.steamID.accountid;

        const profileResponse = await dota.sendJob(EDOTAGCMsg.k_EMsgClientToGCGetProfileCard, {
          accountId,
        });

        let statsResponse = {};
        try {
          statsResponse = await dota.sendJob(EDOTAGCMsg.k_EMsgClientToGCPlayerStatsRequest, {
            accountId,
          });
        } catch (e) {
          logger.warn('Stats request failed', { error: e.message });
        }

        const doubleDownTokens = client.doubleDownTokens || 0;
        const behaviorScore = client.lastBehaviorScore || statsResponse.behaviorScore || 'Private';
        const lowPriorityGames = client.lastLowPriorityGames || 0;
        const isMatchBanned = (client.lastMatchDisabledUntil || 0) > Date.now() / 1000;
        const isLP = lowPriorityGames > 0 || isMatchBanned;

        const profile = profileResponse || {};
        let commends = 0;
        if (profile.slots && Array.isArray(profile.slots)) {
          const commendsSlot = profile.slots.find((s) => s.stat && s.stat.statId === 4);
          if (commendsSlot && commendsSlot.stat) {
            commends = commendsSlot.stat.statScore || 0;
          }
        }

        safeResolve({
          rank_tier: profile.rankTier || 0,
          leaderboard_rank: profile.leaderboardRank || 0,
          behavior_score: behaviorScore,
          commends,
          match_count: profile.lifetimeGames || statsResponse.matchCount || 0,
          dota_plus: profile.isPlusSubscriber || false,
          role_tokens: 0,
          double_down: doubleDownTokens,
          low_priority: isLP,
        });
      } catch (e) {
        logger.error('Error in GC response handling', { error: e.message });
        safeReject(e);
      }
    });

    client.logOn({
      accountName: login,
      password,
    });
  });
}

function decodeRank(tier) {
  if (!tier) return 'Uncalibrated';
  const main = Math.floor(tier / 10);
  const star = tier % 10;
  const rankName = RANKS[main - 1] || 'Unknown';
  return `${rankName} ${star}`;
}

module.exports = {
  checkAccount,
  decodeRank,
};
