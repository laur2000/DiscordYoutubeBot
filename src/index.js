require("dotenv").config();
const Discord = require("discord.js");
const ytdl = require("ytdl-core");
const youtubeSearcher = require("@guillex7/youtube-searcher");
const { ContentFilter } = require("@guillex7/youtube-searcher/build/types");

const { prefix, token } = {
  prefix: "!",
  token: process.env.DISCORD_TOKEN,
};


const prefixes = {};
const loops = {};
const radios = {};

const client = new Discord.Client();
const queue = new Map();

client.login(token)

client.once("ready", () => {
  console.log("Ready!");
});
client.once("reconnecting", () => {
  console.log("Reconnecting!");
});
client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async (message) => {
  if (message.author.bot) return;
  const guild = message.guild.id;
  const localPrefix = getGuildPrefix(guild)
  const serverQueue = queue.get(guild);
  if (!message.content.startsWith(localPrefix)) return;

  if (message.content.startsWith(`${localPrefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${localPrefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${localPrefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${localPrefix}radio`)) {
    radio(message, guild)
    return;
  } else if (message.content.startsWith(`${localPrefix}help`)) {
    help(message)
    return;
  } else if (message.content.startsWith(`${localPrefix}prefix`)) {
    changePrefix(message, guild);
  } else if (message.content.startsWith(`${localPrefix}loop`)) {
    loop(message, guild);
  } else {
    message.channel.send("You need to enter a valid command!");
  }
});

function loop(message, guild) {
  loops[guild] = !loops[guild];
  return message.channel.send(`
  `);
}

function help(message) {
  const guildId = message.guild.id;
  const localPrefix = getGuildPrefix(guildId)
  return message.channel.send(`These are the available commands for the bot, use them with the prefix and the command name:\n
  \`${localPrefix}play url/song name\`Plays a youtube video by its url or by its name\n
  \`${localPrefix}stop\` Stops the bot and disconnects it from the channel\n
  \`${localPrefix}skip\` Skips the current song in the queue\n
  \`${localPrefix}loop\` When enabled the songs are not removed from the queue and are placed back\n
  \`${localPrefix}radio\` When enabled it plays the next recommended song based on the previous song\n
  \`${localPrefix}prefix newprefix\` Changes the prefix used for executing commands, the current prefix is \`${localPrefix}\`\n
  \`${localPrefix}help\` Shows information about the available commands\n`);
}

function radio(message, guild) {
  radios[guild] = !radios[guild];
  return message.channel.send("The queue is" + (radios[guild] ? " " : " not ") + "playing in radio mode");
}

function changePrefix(message, guild) {
  const args = message.content.split(" ");
  if (args.length !== 2) {
    return message.channel.send("You must provide only an argument");
  }

  prefixes[guild] = args[1];

  return message.channel.send("Prefix changed to " + prefixes[guild]);
}

async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }

  let url = args[1];
  const isValidUrl = ytdl.validateURL(url);

  if (!isValidUrl) {
    const [command, ...searchQuery] = args;
    const videos = await youtubeSearcher.search(searchQuery.join(""), ContentFilter.VIDEO);
    if (!videos.length) {
      return message.channel.send("No Youtube video found! try using another words");
    }
    url = `https://www.youtube.com/watch?v=${videos[0].id}`;
  }

  const song = await getSong(url)

  if (!serverQueue) {
    // Creating the contract for our queue
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };
    // Setting the queue using our contract
    queue.set(message.guild.id, queueContruct);
    // Pushing the song to our songs array
    queueContruct.songs.push(song);

    try {
      // Here we try to join the voicechat and save our connection into our object.
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      connection.on('disconnect', () => {
        queue.delete(message.guild.id)
      })
      // Calling the play function to start a song
      await play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      // Printing the error message if the bot fails to join the voicechat
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    if (serverQueue.songs.length === 1) {
      await play(message.guild, serverQueue.songs[0]);
    }
    return message.channel.send(`The song ${song.title} has been added to the queue!`);
  }
}

async function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(
      ytdl(song.url, {
        filter: "audioonly",
        quality: "highestaudio",
        highWaterMark: 1 << 25,
      }),
      { highWaterMark: 1 }
    )
    .on("finish", async () => {
      const lastSong = serverQueue.songs.shift();
      if (loops[guild.id]) {
        serverQueue.songs.push(lastSong);
      }
      let currentSong = serverQueue.songs[0]

      if (!currentSong) {
        if (!radios[guild.id]) {
          return;
        }

        if (song.related_videos && song.related_videos[0]) {
          const videoid = song.related_videos[0].id
          const url = `https://www.youtube.com/watch?v=${videoid}`
          const radioSong = await getSong(url)
          serverQueue.songs.push(radioSong)
          currentSong = radioSong
        }

      }


      play(guild, currentSong);
    })
    .on("error", (error) => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Started playing: **${song.title}**`);
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue || !serverQueue.songs.length)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );

  if (!serverQueue)
    return message.channel.send("There is no song that I could stop!");


  serverQueue.connection.disconnect()
  queue.delete(message.guild.id);

}


async function getSong(url) {
  const { videoDetails: { title }, related_videos } = await ytdl.getInfo(url);

  const song = {
    url, title, related_videos
  };

  return song
}

function getGuildPrefix(guildId) {
  return prefixes[guildId] || prefix
}