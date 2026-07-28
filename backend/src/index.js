import 'dotenv/config';
import app from "./app.js";
import connectDB from "./db/index.js";

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`App is listening on PORT: ${process.env.PORT || 8000}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed", error);
  });

export default app;
















// app.get("/", (req, res) => {
//   res.send("Hello Worldqq!   aasdasdsadasdasd");
// });

// app.get("/api/jokes", (req, res) => {
//   const jokes = [
//     {
//       name: "one1",
//       descripition: "hello jokes ",
//     },
//     {
//       name: "one2",
//       descripition: "hello jokes ",
//     },
//     {
//       name: "one3",
//       descripition: "hello jokes ",
//     },
//   ];
//   res.send(jokes);
// });

// app.listen(process.env.PORT, () => {
//   console.log(`Example app listening on port ${process.env.PORT}`);
// });

// console.log(`Hello ${process.env.PORT}`);
