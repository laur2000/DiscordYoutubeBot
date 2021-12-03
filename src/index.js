const Discord = require("discord.js");
const ytdl = require("ytdl-core");
const yt = require("youtube-search-without-api-key");

const { prefix, token } = {
  prefix: "!",
  token: process.env.DISCORD_TOKEN,
};


const prefixes = {};
const loops = {};

const client = new Discord.Client();
const queue = new Map();

client.login(token);

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
  const localPrefix = prefixes[guild] || prefix;
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
  } else if (message.content.startsWith(`${localPrefix}prefix`)) {
    changePrefix(message, guild);
  }else if (message.content.startsWith(`${localPrefix}loop`)) {
    loop(guild);
  } else {
    message.channel.send("You need to enter a valid command!");
  }
});

function loop(guild) {
  loops[guild] = !loops[guild];
  return message.channel.send("The queue is"+ (loops[guild] ? " " : " not ")+ "in loop");
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
    const videos = await yt.search(searchQuery.join(""));
    url = videos[0].url;
  }
  const songInfo = await ytdl.getInfo(url);
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
  };

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
      // Calling the play function to start a song
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      // Printing the error message if the bot fails to join the voicechat
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`The song ${song.title} has been added to the queue!`);
  }
}

function play(guild, song) {
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
    .on("finish", () => {
      const lastSong = serverQueue.songs.shift();
      if(loops[guild.id]) {
        serverQueue.songs.push(lastSong);
      }
      play(guild, serverQueue.songs[0]);
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
  if (!serverQueue)
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

  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}
