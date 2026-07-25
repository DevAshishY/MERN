import express from 'express';
import cors from "cors";
import cookieParser from 'cookie-parser';
import useRouter from './routes/user.route.js';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use('/api/v1/users', useRouter);

export default app;