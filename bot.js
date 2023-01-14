const execSync = require("child_process").execSync;
const fs = require("fs");
require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const token = process.env.TOKEN;

const bot = new TelegramBot(token, { polling: true, filepath: false });

bot.on("message", async (msg) => {
  console.log(msg);
  if (!msg.text) return;

  let userId;
  let username;
  if (
    Array.isArray(msg.entities) &&
    msg.entities.length &&
    msg.entities[0].type === "text_mention"
  ) {
    const anotherRe = /[Гг][аa]в/;
    const texts = msg.text.split(" ");
    texts.forEach((element) => {
      if (element.match(anotherRe)) {
        userId = msg.entities[0].user.id;
        username =
          msg.entities[0].user.first_name +
          " " +
          msg.entities[0].user.last_name;
      }
    });
  } else {
    const re = /[Мм][аa]ким[aа] иди (н[аa]х[yу]й|н[аa] х[yу]й)/;
    if (!msg.text.match(re)) return;
    userId = msg.from.id;
    username = msg.from.first_name + " " + msg.from.last_name;
  }
  const userPhoto = await getCurrentUserProfilePhoto(userId);
  if (!userPhoto) return;
  console.log(username);
  fs.writeFileSync("./image.jpg", userPhoto);
  console.log("hello");

  generateMakimaKill(username);
  // send a message to the chat acknowledging receipt of their message
  const endFile = fs.readFileSync("./out.mp4");
  bot.sendVideo(msg.chat.id, endFile);
  // bot.sendMessage(chatId, "Received your message");
});

const getCurrentUserProfilePhoto = async (userId) => {
  const options = {
    method: "POST",
    url: `https://api.telegram.org/bot${token}/getUserProfilePhotos`,
    headers: { accept: "application/json", "content-type": "application/json" },
    data: { user_id: userId },
  };

  const res = await axios.request(options);
  console.log(res.data.result.photos);
  if (!res.data.result.photos) return;
  const fileId = res.data.result.photos[0][0].file_id;
  const fileInfo = await getFileInfo(fileId);
  if (!fileInfo) return;
  const filePath = fileInfo.result.file_path;
  const userProfilePhoto = await axios({
    method: "GET",
    url: `https://api.telegram.org/file/bot${token}/${filePath}`,
    responseType: "arraybuffer",
  });
  // const userPhoto = new Blob(userProfilePhoto.data);

  return userProfilePhoto.data;
};

const getFileInfo = async (fileId) => {
  const options = {
    method: "POST",
    url: `https://api.telegram.org/bot${token}/getFile`,
    headers: { accept: "application/json", "content-type": "application/json" },
    data: {
      file_id: fileId,
    },
  };

  const res = await axios.request(options);
  return res.data;
};

const generateMakimaKill = (name) => {
  execSync(
    `ffmpeg -i input.mp4 -vf "drawtext=fontfile=./OpenSans.ttf:text='Скажи ${name}':fontcolor=black:fontsize=56:x=(w-text_w)/2:y=(h-text_h-72):enable='between(t,7,10)', \
    drawtext=fontfile=./OpenSans.ttf:text='${name}':fontcolor=black:fontsize=56:x=(w-text_w)/2:y=(h-text_h-72):enable='between(t,12,14)' \
    " -codec:a copy output.mp4 -y`,
    { encoding: "utf-8" }
  );

  //prepare another video
  execSync(`ffmpeg -framerate 1 -i image.jpg  -c:v libx264 -r 30 test.mp4 -y`);

  execSync(`ffmpeg -i output.mp4 -i test.mp4 -filter_complex "[0:v]scale=720x480,setpts=PTS-STARTPTS[output]; [1:v]setpts=PTS-STARTPTS+16.60/TB, \
    scale=320:'400*abs(sin((t-2)*2*PI/8))':eval=frame[test]; \
    [output][test]overlay=y=(main_h-overlay_h)/2:x=(main_w-overlay_w)/2:enable='between(t,16.21,17.4)'" -vcodec libx264 out.mp4 -y`);
};
