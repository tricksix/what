const fs = require('fs').promises;
const mime = require('mime-types');
const venom = require('venom-bot');
const express = require('express');
const bodyParser = require('body-parser');
const {
  body,
  validationResult
} = require('express-validator');
const moment = require("moment");
const app = express();
const {
  createSimport
} = require('simport');
const simport = createSimport(__filename);
const winston = require('winston');
// const chatsAllNew = getAllChatsNewMsg();
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(express.static('assets'));
app.use(express.json());
app.set('views', __dirname + '/views');
app.set('view engine', 'twig');
app.set('twig options', {
  strict_variables: false
});
const PORT = 8181;
var State = {
  statusSession: null
}
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: {
    service: 'system-logs'
  },
  transports: [
    new winston.transports.File({
      filename: './logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: './logs/combined.log'
    }),
  ],
});
async function start(client) {
  app.listen(PORT, function () {
    console.log(`\n• Listening on port ${PORT}!`);
  });
  app.get("/login", async (req, res) => {
    if (State.statusSession == "notLogged" || State.statusSession == "deviceNotConnected") {
      res.render("home");
    } else {
      res.json({
        status: State.statusSession
      });
    }
  });
  app.get("/check", async (req, res) => {
    let connectedState = await client.getConnectionState();
    let isConnected = await client.isConnected();
    res.json({
      connectedState: connectedState,
      isConnected: isConnected,
    });
  });
  app.post("/apiSendText", [
    body("phone_number", "cannot be empty").notEmpty(),
    body("phone_message", "cannot be empty").notEmpty(),
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.json({
          error: true,
          data: errors
        })
        return;
      }
      let isConnected = await client.isConnected();
      if (!isConnected) {
        throw new Error("Device Not Connected");
      }
      await new Promise(async (resolve, reject) => {
        process.on('unhandledRejection', async (err) => {
          reject(new Error(err.toString()));
        });
        process.on('uncaughtException', async (err) => {
          reject(new Error(err.toString()));
        });
        res.setTimeout(parseInt(10000), () => {
          reject(new Error('The message has been processed, please wait a few minutes'));
        });
        let isExistNumber = await client.checkNumberStatus(req.body.phone_number);
        if (isExistNumber) {
          // await client.sendText(req.body.phone_number, req.body.phone_message);
          await client
            .sendImage(
              req.body.phone_number,
              './gambar/wa_image.png',
              'WebSekolah',
              req.body.phone_message
            )
          .then((result) => {
            console.log('Result: ', result); //return object success
          })
          .catch((erro) => {
            console.error('Error when sending: ', erro); //return object error
          });
          logger.log({
            level: "info",
            message: `${moment().format("YYYYMMDDHHmmss")} - ${JSON.stringify(req.body)}`
          });
        } else {
          logger.log({
            level: "error",
            message: `${moment().format("YYYYMMDDHHmmss")} - The number does not exist`
          });
        }
        resolve();
      });
      res.json({
        error: false,
        data: req.body
      });
    } catch (e) {
      logger.log({
        level: "error",
        message: `${moment().format("YYYYMMDDHHmmss")} - ${e.toString()}`
      });
      res.json({
        error: true,
        data: e.toString(),
        params: req.body
      });
    }
  });
  app.post("/apiSendBoom", [
    body("phone_number", "cannot be empty").notEmpty(),
    body("phone_message", "cannot be empty").notEmpty(),
    body("qty", "cannot be empty").notEmpty()
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.json({
          error: true,
          data: errors
        })
        return;
      }
      for (let i = 1; i <= parseInt(req.body.qty); i++) {
        queue.add(async () => {
          try {
            await client.sendText(req.body.phone_number, req.body.phone_message)
            return Promise.resolve(true);
          } catch (e) {
            return Promise.reject(new Error(e));
          }
        });
      }
      res.json({
        error: false,
        data: req.body
      });
    } catch (e) {
      res.send(e.toString());
    }
  });
  app.get("/getDeviceInfo", async (req, res) => {
    try {
      let hostDevice = await client.getHostDevice();
      let connectionState = await client.getConnectionState();
      let batteryLevel = await client.getBatteryLevel();
      let isConnected = await client.isConnected();
      let waVersion = await client.getWAVersion();
      res.json({
        hostDevice,
        connectionState,
        batteryLevel,
        isConnected,
        waVersion
      });
    } catch (e) {
      res.send(e.toString());
    }
  });
  const PQueue = (await simport('../smkcakra/node_modules/p-queue/dist/index.js')).default;
  const queue = new PQueue({
    concurrency: 1
  });
  process.on('unhandledRejection', error => {
    logger.log({
      level: "error",
      message: `${moment().format("YYYYMMDDHHmmss")} - ${error.message}`
    });
  });
  queue.on("error", (error) => {
    console.log("Error : ", error);
  });
  queue.on("completed", (result) => {
    console.log("Berhasil Dikirim");
  });
  client.onStateChange((state) => {
    console.log('State changed: ', state);
    if ('CONFLICT'.includes(state)) {
      client.useHere()
    };
    if ('UNPAIRED'.includes(state)) {
      console.log('logout')
    };
  });
  // let time = 0;
  client.onMessage(async (message) => {
    if (message.body == 'HELP' || message.body === 'Help' || message.body === 'help' && message.isGroupMsg == true) {
      client
        .sendText(message.from, '```Hai ini pesan otomatis edunesia, Silahkan ketik kata :``` *Hallo*')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
    } 
    else if (message.body === 'Stiker' || message.body === 'stiker' && message.isGroupMsg === false) {
      client
        .sendImageAsSticker(message.from, './foto.jpg')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
    } 
    else if (message.body === '1' && message.isGroupMsg === false) {
      client
        .sendText(message.from, 'Silahkan Mengikuti tautan ini untuk melakukan prosees pendaftaran\n🌐 https://edunesa.com/\n\n ```Pastikan mengisi form dengan lengkap```')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
    } else if (message.body === '2' && message.isGroupMsg === false) {
      client
        .sendText(message.from, 'Silahkan membagikan lokasi anda / lakukan share lokasi saat anda berada pada lokasi yang tepat👍\n\nMohon kami diberikan informasi tentang:\nNama : ...\nID / Kelas : ...\nMetode Pembelajaran : ...\nKeluhan : ...\n\n```Admin akan menghubungi anda sesegera mungkin```')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
    } else if (message.body === '3' && message.isGroupMsg === false) {
      client
        .sendText(message.from, 'Silahkan berbincang dengan admin kami,\n*Ahmad*\n☎ https://wa.me/6281216800840 \n```atau```\n*Lili*\n ☎ https://wa.me/6285649998134')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
    } else if (message.body === 'Hallo' || message.body === 'hallo' || message.body === 'Hai' && message.isGroupMsg === true) {
      client
        .sendText(message.from, 'Selamat datang di edunesia.com. \n Kamu bisa memilih menu di bawah ini :\n\n1⃣ Informasi Pendaftaran\n2⃣ Layanan Keluhan\n3⃣ Berbicara langsung dengan Admin kami\n\n```Pesan Ini Dikirim Otomatis Oleh Sistem```\nHappy Online')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
    } else if (message.isMedia === true || message.isMMS === true) {
      try {
        console.log('Media message received, processing...');
        const buffer = await client.decryptFile(message);
        const fileName = `some-file-name.${mime.extension(message.mimetype)}`;
        
        console.log('Writing file to disk:', fileName);
        await fs.writeFile(fileName, buffer);
        
        console.log('Sending image as sticker...');
        await client.sendImageAsSticker(message.from, fileName);
        
        console.log('Sticker sent, deleting file...');
        await fs.unlink(fileName);
        
        console.log('File deleted successfully.');
      } catch (err) {
        console.error('Error processing media message:', err);
      }
    }
  });
  client.onStateChange((state) => {
    if ('CONFLICT'.includes(state)) {
      client.useHere()
    };
    if ('UNPAIRED'.includes(state)) {
      console.log('logout')
    };
  });
  client.onIncomingCall(async (call) => {
    console.log(call);
    client.sendText(call.peerJid, "```nanti saya hub kembali jika memungkinkan```\n\n```pesan otomatis```");
  });
}
venom
  .create(
    'PANJI_NEW',
    (base64Qr, asciiQR, attempts, urlCode) => {
      let matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
        response = {};
      if (matches.length !== 3) {
        return new Error('Invalid input string');
      }
      response.type = matches[1];
      response.data = new Buffer.from(matches[2], 'base64');
      let imageBuffer = response;
      require('fs').writeFile(
        'assets/wa-storage/qr/out.png',
        imageBuffer['data'],
        'binary',
        function (err) {
          if (err != null) {
            console.log(err);
          }
        }
      );
    },
    (statusSession, session) => {
      console.log('Status Session: ', statusSession);
      console.log('Session name: ', session);
      State.statusSession = statusSession;
    }, {
      multidevice: false, // for version not multidevice use false.(default: true)
      folderNameToken: 'assets/wa-storage/session', //folder name when saving tokens
      mkdirFolderToken: '', //folder directory tokens, just inside the venom folder, example:  { mkdirFolderToken: '/node_modules', } //will save the tokens folder in the node_modules directory
      headless: true, // Headless chrome
      devtools: false, // Open devtools by default
      useChrome: false, // If false will use Chromium instance
      debug: false, // Opens a debug session
      logQR: true, // Logs QR automatically in terminal
      browserWS: '', // If u want to use browserWSEndpoint
      browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'], //Original parameters  ---Parameters to be added into the chrome browser instance
      puppeteerOptions: {}, // Will be passed to puppeteer.launch
      disableSpins: true, // Will disable Spinnies animation, useful for containers (docker) for a better log
      disableWelcome: true, // Will disable the welcoming message which appears in the beginning
      updatesLog: true, // Logs info updates automatically in terminal
      autoClose: 0, // Automatically closes the venom-bot only when scanning the QR code (default 60 seconds, if you want to turn it off, assign 0 or false)
      createPathFileToken: false, //creates a folder when inserting an object in the client's browser, to work it is necessary to pass the parameters in the function create browserSessionToken
    },
    undefined,
    undefined
  )
  .then(client => start(client))
  .catch((erro) => {
    console.log(erro);
  });
