const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(fileUpload());

const files = {};
const CODE_EXPIRATION_TIME = 5 * 60 * 1000; // 5분 후 코드 만료
const FILE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24시간 후 파일 삭제

// 루트 경로 처리
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 파일 업로드 엔드포인트
app.post('/upload', (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    let uploadedFile = req.files.file;
    let code = Math.floor(Math.random() * 10000); // 4자리 숫자 코드 생성
    let filePath = path.join(__dirname, 'uploads', uploadedFile.name);

    uploadedFile.mv(filePath, (err) => {
        if (err) return res.status(500).send(err);

        files[code] = {
            path: filePath,
            timestamp: Date.now()
        };

        // 코드 만료 (5분 후)
        setTimeout(() => {
            delete files[code];
        }, CODE_EXPIRATION_TIME);

        // 파일 삭제 (24시간 후)
        setTimeout(() => {
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    if (err) console.error(`Error deleting file: ${filePath}`, err);
                });
            }
        }, FILE_EXPIRATION_TIME);

        res.send({ code: code });
    });
});


// 파일 다운로드 엔드포인트
app.get('/download/:code', (req, res) => {
    let code = req.params.code;
    let fileData = files[code];

    if (!fileData) {
        return res.status(404).send('Invalid code or file not found.');
    }

    res.download(fileData.path, (err) => {
        if (!err) delete files[code]; // 다운로드 후 코드 삭제
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
