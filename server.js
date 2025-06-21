const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(fileUpload());

const files = {};
const CODE_EXPIRATION_TIME = 10 * 60 * 1000; // 10분 후 코드 만료
const FILE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24시간 후 파일 삭제

const { v4: uuidv4 } = require('uuid');

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
    let code = Math.floor(Math.random() * 10000); // 4자리 숫자 코드
    let extension = path.extname(uploadedFile.name); // 원본 확장자 유지
    let uuidFileName = `${uuidv4()}${extension}`;
    let filePath = path.join(__dirname, 'uploads', uuidFileName);

    uploadedFile.mv(filePath, (err) => {
        if (err) return res.status(500).send(err);

        files[code] = {
            path: filePath,
            originalName: uploadedFile.name,
            uuidName: uuidFileName,
            timestamp: Date.now()
        };

        // 코드 만료
        setTimeout(() => delete files[code], CODE_EXPIRATION_TIME);

        // 파일 삭제
        setTimeout(() => {
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    if (err) console.error(`Error deleting file: ${filePath}`, err);
                });
            }
        }, FILE_EXPIRATION_TIME);

        res.send({ code });
    });
});


// 파일 다운로드 엔드포인트
app.get('/download/:code', (req, res) => {
    const code = req.params.code;
    const fileData = files[code];

    if (!fileData) {
        return res.status(404).send('Invalid code or file not found.');
    }

    res.download(fileData.path, fileData.uuidName, (err) => {
        if (!err) {
            fileData.downloaded = true; // 다운로드 기록
            delete files[code];         // 코드 삭제는 유지
        }
    });
});


// 파일 상태 확인용 엔드포인트
app.get('/status/:code', (req, res) => {
    const code = req.params.code;
    const fileData = files[code];

    if (!fileData) {
        return res.status(404).json({ exists: false });
    }

    res.json({ exists: true, downloaded: !!fileData.downloaded });
});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
