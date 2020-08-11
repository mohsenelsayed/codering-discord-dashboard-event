const passport = require('passport');
const { Strategy } = require('passport-discord');
const axios = require('axios');

const User = require('./database/models/User');
const Guild = require('./database/models/Guild');

passport.serializeUser((user, done) => {
  done(null, user.userId);
});

passport.deserializeUser(async (userId, done) => {
  const user = await User.findOne({ userId });
  return user && done(null, user);
});

passport.use(new Strategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CLIENT_CALLBACK_URL,
  scope: ['identify', 'guilds'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ userId: profile.id });
    if (!user) {
      const userGuilds = profile.guilds.filter(async (g) => {
        const guilds = await axios.get('https://discord.com/api/v6/users/@me/guilds', {
          headers: {
            Authorization: `Bot ${process.env.BOT_TOKEN}`,
          },
        });
        if ((g.permissions & 32) === 32 && guilds.some((i) => i.id === g.id)) return true;
        return false;
      });
      const objIds = [];
      for (const g of userGuilds) {
        // eslint-disable-next-line no-await-in-loop
        let guild = await Guild.findOne({ guildId: g.id });
        if (!guild) {
          guild = (new Guild({
            guildId: g.id,
            prefix: '!',
          })).save();
        }
        objIds.push(guild.id);
      }
      user = (new User({
        userId: profile.id,
        discordTag: `${profile.username}#${profile.discriminator}`,
        guilds: objIds,
      })).save();
    } else {
      const userGuilds = profile.guilds.filter(async (g) => {
        const guilds = await axios.get('https://discord.com/api/v6/users/@me/guilds', {
          headers: {
            Authorization: `Bot ${process.env.BOT_TOKEN}`,
          },
        });
        if ((g.permissions & 32) === 32 && guilds.some((i) => i.id === g.id)) return true;
        return false;
      });
      const objIds = [];
      for (const g of userGuilds) {
        // eslint-disable-next-line no-await-in-loop
        let guild = await Guild.findOne({ guildId: g.id });
        if (!guild) {
          guild = (new Guild({
            guildId: g.id,
            prefix: '!',
          })).save();
        }
        objIds.push(guild.id);
      }
      user = User.findOneAndUpdate({ discordTag: `${profile.username}#${profile.discriminator}`, guilds: objIds });
    }
    done(null, user);
  } catch (e) {
    done(e);
  }
}));

module.exports = passport;
