const express = require('express');
const https = require('https');
const { readFileSync, existsSync, mkdirSync, writeFile } = require('node:fs');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = https.createServer({
  key: readFileSync('./privkey.pem'),
  cert: readFileSync('./cert.pem')
}, app);
const io = new Server(server);
const fs = require("fs")

server.listen(3002, () => {
  console.log('server running at http://localhost:3002');
});


app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'admin.html'));
})
//set static directory
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('chat message', (msg) => {
    console.log('message: ' + msg);
  });
  socket.on("test", data => {
    console.log("Test", data);
  });

  socket.on("newImage", (data => {
    let url = data.url;
    let alt = data.alt;
    let name = data.name;
    console.log(url, alt)
    //append to ./public/forReview.json
    addImage(url, alt, "forReview.json", data.sessionID, name)

  }))

  socket.on("accept", (data => {
    let url = data.url,
      alt = data.alt,
      name = data.name;
    console.log(url, alt, name)
    //append to ./public/images.json
    addImage(url, alt, "images.json", data.id, name)
    removeImage(data.id, "forReview.json")
  }))

  socket.on("reject", (data => {
    let url = data.url,
      alt = data.alt,
      name = data.name;
    console.log(url, alt)
    //remove from ./public/forReview.json
    removeImage(data.id, "forReview.json", true)
  }))
});

function addImage(url, alt, file, sessionID, name) {
  fs.readFile("./public/" + file, (err, data) => {
    if (err) throw err;
    const images = JSON.parse(data);
    console.log(images)
    images.push({ "url": url, "alt": alt, "id": sessionID, "name": name });
    fs.writeFile("./public/" + file, JSON.stringify(images), (err) => {
      if (err) throw err;
      console.log("New image added");
      io.emit("reloadImages", { submitted: true, sessionID: sessionID })
    });
  })
}

function removeImage(id, file, reload) {
  fs.readFile("./public/" + file, (err, data) => {
    if (err) throw err;
    let images = JSON.parse(data);
    const index = images.findIndex(image => image.id === id);
    if (index !== -1) {
      images.splice(index, 1);
      fs.writeFile("./public/" + file, JSON.stringify(images), (err) => {
        if (err) throw err;
        console.log("Image removed");
        if (reload) {
          io.emit("reloadImages", { submitted: false })
        }
      });
      // Optionally, you might want to emit an event to notify clients about the removal
      // io.emit("imageRemoved", { id });

    } else {
      console.log("Image not found");
      // Optionally, you might want to handle the case where the image with the provided id is not found
    }
  });
}



var dir = './public';
if (!existsSync(dir)) {
  mkdirSync(dir);
}
//check if x.json exists, if it does not then create it and put "[]" inside the file
if (!existsSync('./images.json')) {
  writeFile('./images.json', '[]', (err) => {
    if (err) logToFile(err);
  });
} if (!existsSync('./forReview.json')) {
  writeFile('./forReview.json', '[]', (err) => {
    if (err) logToFile(err);
  });
}