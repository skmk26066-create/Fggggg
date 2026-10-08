const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS सेटअप ताकि आपका Android App बिना किसी रोक-टोक के कनेक्ट हो सके
const io = new Server(server, { 
    cors: { origin: '*' } 
});

app.get('/', (req, res) => {
    res.send("Backend Server is Running! Enter this URL in your Android App Settings.");
});

// जब Android App सॉकेट से कनेक्ट होगा
io.on('connection', (socket) => {
    console.log('Android App connected. Socket ID:', socket.id);

    // ऐप से 'start_process' कमांड सुनना
    socket.on('start_process', async (data) => {
        const { sourceLink, serversToUpload } = data;
        console.log("Request received for:", sourceLink);
        
        let generatedLinks = {};

        try {
            // स्टेप 1: फाइल प्रोसेसिंग शुरू
            socket.emit('progress', { status: 'Server Connecting & Fetching Video...', percent: 10 });
            await delay(2000); // यहाँ असल डाउनलोड स्ट्रीम कोड आएगा

            // स्टेप 2: TeraBox पर अपलोडिंग (अगर ऐप से टिक किया गया है)
            if (serversToUpload.terabox) {
                socket.emit('progress', { status: 'Uploading to TeraBox...', percent: 30 });
                await delay(3000); // यहाँ TeraBox का API कॉल आएगा
                generatedLinks.terabox = "https://terabox.com/s/generated_auto_link";
            }

            // स्टेप 3: Diskwala पर अपलोडिंग
            if (serversToUpload.diskwala) {
                socket.emit('progress', { status: 'Uploading to Diskwala...', percent: 60 });
                await delay(3000); // यहाँ Diskwala का API कॉल आएगा
                generatedLinks.diskwala = "https://diskwala.com/s/generated_auto_link";
            }

            // स्टेप 4: TenBox पर अपलोडिंग
            if (serversToUpload.tenbox) {
                socket.emit('progress', { status: 'Uploading to TenBox...', percent: 90 });
                await delay(3000); // यहाँ TenBox का API कॉल आएगा
                generatedLinks.tenbox = "https://tenbox.com/s/generated_auto_link";
            }

            // स्टेप 5: फाइनली ऐप को सक्सेस मैसेज और लिंक्स भेजना
            socket.emit('process_complete', {
                status: 'Task Completed Successfully!',
                percent: 100,
                links: generatedLinks
            });
            console.log("Task finished and links sent to Android App.");

        } catch (error) {
            console.error("Error:", error);
            socket.emit('error', { message: 'Server Upload Failed', details: error.message });
        }
    });

    socket.on('disconnect', () => {
        console.log('App disconnected:', socket.id);
    });
});

// डिले फंक्शन (सिर्फ डेमो के लिए, इसे बाद में असली API कॉल से बदल दिया जाएगा)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Render पर पोर्ट डायनामिक होता है
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
