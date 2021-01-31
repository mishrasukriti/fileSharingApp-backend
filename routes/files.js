const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const File = require('../models/file');
const { v4: uuidv4 } = require('uuid');


// Dependencies for AWS and S3
const cors = require("cors")
const express = require("express");
const dotenv = require("dotenv")
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3')
// const _ = require("lodash")

//Code to upload file(s) to S3
const s3Region = process.env.s3Region
const s3Bucket = process.env.s3Bucket
const s3Config = {
  accessKeyId: process.env.accessKeyId,
  secretAccessKey: process.env.secretAccessKey,
  s3Region: process.env.s3Region,
  s3Bucket: process.env.s3Bucket
};
AWS.config.update(s3Config);

AWS.config.region = s3Region ;

const s3 = new AWS.S3();

const uploadS3 = multer({
       storage: multerS3({
           s3: s3,
           bucket: s3Bucket,
           metadata: function (req, file, cb) {
               cb(null, {fieldName: file.fieldname});
           },
           key: function (req, file, cb) {
               const filename = `${file.originalname}`;
               cb(null, filename)
           }
       })
}).single('myfile');

router.post('/', (req, res) => {
      // Code to upload to s3
      uploadS3(req, res, async (err) => {
        if (err) {
          return res.status(500).send({ error: err.message });
        } 
        try {
          const filename = `${req.file.originalname}`
          const options  ={
            Bucket: s3Bucket,
            Key: filename,
            Expires: 3600, // one hour expires.
          };
          const url = s3.getSignedUrl('getObject', options);  
          // console.log("S3 URL is: " + url);
          res.json({ file: url });
        } catch (error) {
          console.log(error)
          res.status(500).json({
            message: "Internal Server Error"
          });
        }
    });
  });


router.post('/send', async (req, res) => {
  const { url, emailTo, emailFrom, expiresIn } = req.body;
  try {
    const sendMail = require('../services/mailService');
    sendMail({
      from: emailFrom,
      to: emailTo,
      subject: 'Sukriti File sharing Application',
      text: `${emailFrom} shared a file with you.`,
      html: require('../services/emailTemplate')({
                emailFrom, 
                downloadLink: `${url}` ,
                expires: '24 hours'
            })
    }).then(() => {
      // console.log("sukriti sent email");
      return res.json({success: true});
    }).catch(err => {
      console.log("sukriti sneding email:" + err);
      return res.status(500).json({error: 'Error in email sending.'});
    });
} catch(err) {
  return res.status(500).send({ error: 'Something went wrong.'});
}

});

module.exports = router;