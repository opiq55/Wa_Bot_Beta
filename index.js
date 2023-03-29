const fs = require('fs');
const FormData = require('form-data');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia} = require('whatsapp-web.js');
const { Configuration, OpenAIApi, CreateImageRequestSizeEnum } = require("openai");
const axios = require('axios');
const path = require('path');
const puppeteer = require('puppeteer');
const { Socket } = require('dgram');
const configuration = new Configuration({
  apiKey: 'key',
});
const schedule = require('node-schedule');
const openai = new OpenAIApi(configuration);
const client = new Client({
    authStrategy: new LocalAuth(),
});
const rule = new schedule.RecurrenceRule();
        rule.hour = 18;
        rule.minute = 28;
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

const inputPath = '/path/to/file.jpg';
const formData = new FormData();
formData.append('size', 'auto');
formData.append('image_file', fs.createReadStream(inputPath), path.basename(inputPath));
client.initialize();




client.on('ready', () => {
    console.log('Client is ready!');
    client.getChats().then((chats) => {
        const mygroup = chats.find(
            (chat) => chat.name === "マバル"   
        );
        // console.log(chats);
        client.sendMessage(
            mygroup.id._serialized,
            "Haiii, Botnya saat ini sudah aktif!"
        );
        const job = schedule.scheduleJob(rule, function(){
            client.sendMessage(mygroup.id._serialized,
                "SELAMAT BERBUKA PUASA, BAGI YANG PUASA")
        });
        
    });

});

const EditPhotoRequest = async (base64, bg_color) => {

    const result = {
        success: false,
        base64: null,
        message: "",
    }

    return await axios({
        method: 'post',
        url: 'https://api.remove.bg/v1.0/removebg',
        data: {
            image_file_b64: base64,
            bg_color: bg_color
        },
        headers: {
            "accept": "application/json",
            "Content-Type": "application/json",
            "X-Api-Key": "api-key remove bg",
        },
    })
        .then((response) => {
            if (response.status == 200) {
                result.success = true;
                result.base64 = response.data.data.result_b64
            } else {
                result.message = "Failed response";
            }

            return result;
        })
        .catch((error) => {
            result.message = "Error : " + error.message;
            return result;
        });
}

function main(){
    client.on('message', async (msg) => {
        if(msg.body.includes('/ask')){
            try {
                let qst = `Q: ${msg.body}\nA:`;
                const response = await openai.createCompletion({
                  model: "text-davinci-003",
                  prompt: qst,
                  temperature: 0,
                  max_tokens: 300,
                  top_p: 1.0,
                  frequency_penalty: 0.0,
                  presence_penalty: 0.0,
                });
                msg.reply(response.data.choices[0].text);
              } catch (error) {
                if (error.response) {
                  console.log(error.response.status);
                  console.log(error.response.data);
                  console.log(`${error.response.status}\n\n${error.response.data}`);
                }else{
                  console.log(error);
                  msg.sendMessage("Maaf terjadi kesalahan :" + error.message);
                }
                msg.reply("Maaf terjadi kesalahan: " + error.message);
              }
        }else if(msg.body === '/menu'){
            let menu = `----------- Menu -----------\n\n/ask (masukkan pertanyaan)\n/draw (masukkan deskripsi)\n/sticker\n/sendto (62...) (pesan)\n/meme\n/edit_bg (warna)`;
            msg.reply(menu);
        }else if(msg.body.startsWith('/sticker')){
            const gambar = msg.type == 'image';
            if (gambar){
                msg.reply("Tunggu Sebentar ya");
                const media = await msg.downloadMedia();
                client.sendMessage(msg.from, media, {
                    sendMediaAsSticker: true,
                });
            }else{
                msg.reply("Ini bukan format image kakak"); 
            }
        }else if(msg.body.includes('/draw')) {
            try {
                let text = msg.body.split('/draw')[1];
                let qst = `Q: ${text}\nA:`;
                const response = await openai.createImage({
                  prompt: qst,
                  n: 1,
                  size: '1024x1024'
                });
                var imgurl = response.data.data[0].url;
                const media = await MessageMedia.fromUrl(imgurl);
                await client.sendMessage(msg.from, media, text);
              } catch (error) {
                if (error.response) {
                  console.log(error.response.status);
                  console.log(error.response.data);
                  console.log(`${error.response.status}\n\n${error.response.data}`);
                }else{
                  console.log(error);
                  msg.sendMessage("Maaf terjadi kesalahan :" + error.message);
                }
                msg.reply("Maaf terjadi kesalahan: " + error.message);
              }
        
        }else if(msg.body === "/meme"){
            const meme = await axios ("https://meme-api.com/gimme")
            .then(res => res.data)

            client.sendMessage(msg.from, await MessageMedia.fromUrl(meme.url))
        
        }else if (msg.body.startsWith('/sendto ')) { 
            let number = msg.body.split(' ')[1];
            let messageIndex = msg.body.indexOf(number) + number.length;
            let message = msg.body.slice(messageIndex, msg.body.length);
            number = number.includes('@c.us') ? number : `${number}@c.us`;
            let chat = await msg.getChat();
            chat.sendSeen();
            client.sendMessage(number, message);
        }else if(msg.body === "/memepolos"){
            var url = "https://candaan-api.vercel.app/api/image/";
            axios.get(url).then((data) => msg.reply(data.data.url));
            
            
        }else if(msg.body.includes('/edit_bg')){
            const color = msg.body.split(' ')[1];
            
            if (msg.hasMedia){
                if (msg.type != 'image'){
                    return msg.reply ("Edit Background hanya bisa dengan format image");
                }
                msg.reply("Tunggu sebentar ya, sedang diproses");

                const media = await msg.downloadMedia();
                const chat = await msg.getChat();

                if(media ){
                    const newPhoto = await EditPhotoRequest(media.data, color);
                    if (!newPhoto.success){
                        return msg.reply ("Terjadi kesalahan");
                    }
                    media.data = newPhoto.base64;
                    chat.sendMessage(media, {caption : 'ini hasilnya '})
                }
            }
        }
    });
};

main()


