const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const app = express();
const server = http.createServer(app);

// CORS सेटअप 
const io = new Server(server, { cors: { origin: '*' } });

app.get('/', (req, res) => res.send("Final S2S Uploader API is Running!"));

// फाइल डाउनलोड करने का फंक्शन
async function downloadFileToVPS(url, destPath) {
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    const writer = fs.createWriteStream(destPath);
    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        let error = null;
        writer.on('error', err => { error = err; writer.close(); reject(err); });
        writer.on('close', () => { if (!error) resolve(true); });
    });
}

// फाइल अपलोड करने का फंक्शन (API के ज़रिए)
async function uploadFileToCloud(filePath, uploadApiUrl, apiKey) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    // अगर API में कोई और डेटा भेजना हो, तो यहाँ जोड़ें
    form.append('api_key', apiKey); 

    const response = await axios.post(uploadApiUrl, form, {
        headers: { ...form.getHeaders() },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    });
    return response.data; // API से जनरेट हुआ लिंक या रिस्पॉन्स
}

io.on('connection', (socket) => {
    console.log('App connected. Socket ID:', socket.id);

    socket.on('start_process', async (data) => {
        const { sourceLink, serversToUpload } = data;
        let generatedLinks = {};
        const tempFileName = `video_${Date.now()}.mp4`;
        const tempFilePath = path.join(__dirname, tempFileName);

        try {
            // स्टेप 1: ऑरिजिनल लिंक से वीडियो डाउनलोड करना (VPS में)
            socket.emit('progress', { status: 'Downloading Video to Server...', percent: 15 });
            
            // *नोट (डेवलपर के लिए): अगर TeraBox/Diskwala का लिंक है, तो पहले डायरेक्ट .mp4 लिंक scrape/extract करना होगा।*
            const directMp4Link = sourceLink; // यहाँ Extracted Direct Link आएगा
            await downloadFileToVPS(directMp4Link, tempFilePath);
            socket.emit('progress', { status: 'Download Complete. Preparing to Upload...', percent: 40 });

            // स्टेप 2: चुने गए सर्वर्स पर अपलोड करना
            if (serversToUpload.terabox) {
                socket.emit('progress', { status: 'Uploading to TeraBox API...', percent: 60 });
                // *डेवलपर यहाँ TeraBox का API URL और KEY डालेगा*
                // const tbRes = await uploadFileToCloud(tempFilePath, 'TERABOX_API_URL', 'TERABOX_API_KEY');
                generatedLinks.terabox = "https://terabox.com/s/real_uploaded_link"; // tbRes.link
            }

            if (serversToUpload.diskwala) {
                socket.emit('progress', { status: 'Uploading to Diskwala API...', percent: 80 });
                // *डेवलपर यहाँ Diskwala का API URL और KEY डालेगा*
                // const dwRes = await uploadFileToCloud(tempFilePath, 'DISKWALA_API_URL', 'DISKWALA_API_KEY');
                generatedLinks.diskwala = "https://diskwala.com/s/real_uploaded_link";
            }

            if (serversToUpload.tenbox) {
                socket.emit('progress', { status: 'Uploading to TenBox API...', percent: 95 });
                // *डेवलपर यहाँ TenBox का API URL और KEY डालेगा*
                // const tnxRes = await uploadFileToCloud(tempFilePath, 'TENBOX_API_URL', 'TENBOX_API_KEY');
                generatedLinks.tenbox = "https://tenbox.com/s/real_uploaded_link";
            }

            // स्टेप 3: सर्वर से टेम्परेरी फाइल डिलीट करना (स्टोरेज बचाने के लिए)
            fs.unlinkSync(tempFilePath);

            // स्टेप 4: ऐप को फाइनल लिंक्स भेजना
            socket.emit('process_complete', {
                status: 'Task Completed Successfully!',
                percent: 100,
                links: generatedLinks
            });

        } catch (error) {
            console.error("Error:", error);
            // एरर आने पर भी टेम्परेरी फाइल डिलीट करें
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            socket.emit('error', { message: 'Transfer Failed', details: error.message });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Final Server running on port ${PORT}`);
});
