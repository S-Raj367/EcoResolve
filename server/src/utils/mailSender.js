// import nodemailer from 'nodemailer';

// const mailSender = async(email,title,body)=>{
    
//     try {

//       const transporter = nodemailer.createTransport({
//     host: process.env.MAIL_HOST,
//     port: Number(process.env.MAIL_PORT),
//     secure: process.env.MAIL_SECURE === "true",

//     auth: {
//         user: process.env.MAIL_USER,
//         pass: process.env.MAIL_PASS,
//     },
// });
//         // console.log('Mail transporter created successfully.');
//         // console.log(transporter);
//         const info = await transporter.sendMail({
//             from: "LearnSpark",
//             to: email, // list of receivers
//             subject: title, // Subject line
//             html: body, // html body
//         });
//         // console.log('Creating mail transporter...');

//         return info;
        
//     } catch (error) {
//         console.error('Error creating mail transporter:', error);
//         throw error; // Rethrow the error after logging
//     }
// }
// export default mailSender;

import axios from "axios";

const mailSender = async (email, title, body) => {
    try {
        const response = await axios.post(
            "https://api.brevo.com/v3/smtp/email",
            {
                sender: {
                    name: "EcoResolve",
                    email: process.env.BREVO_SENDER_EMAIL,
                },
                to: [
                    {
                        email: email,
                    },
                ],
                subject: title,
                htmlContent: body,
            },
            {
                headers: {
                    "api-key": process.env.BREVO_API_KEY,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error(
            "Brevo Error:",
            error.response?.data || error.message
        );
        throw error;
    }
};

export default mailSender;