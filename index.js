const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: [
       "https://car-management-application.vercel.app",
      "https://car-management-application-git-main-saikat-ds-projects.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.juvtn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// custom middleware
const logger = (req, res, next) => {
  console.log("log info:", req.method, req.url);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  // console.log("token in the middleware:", token);
  if (!token) {
    return res.status(401).send({ message: "Not Authorized" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorize access" });
    } else {
      req.user = decoded;
      next();
    }
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carManagement").collection("services");
    const bookingCollection = client.db("carManagement").collection("bookings");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    // jwt api for login
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logged in user", user);

      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // app.post("/jwt", logger, async (req, res) => {
    //   const user = req.body;
    //   console.log(user);
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: "1h",
    //   });
    //   res
    //     .cookie("token", token, {
    //       httpOnly: true,
    //       secure: false,
    //       // sameSite:'none'
    //     })
    //     .send({ success: true });
    // });

    // services related api
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/checkout/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, img: 1, description: 1, price: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    //bookings
    app.get("/bookings", logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log("owner info", req.user);
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateBookings = req.body;
      const updateDoc = {
        $set: {
          status: updateBookings.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Application Run Properly");
});

app.listen(PORT, () => {
  console.log(`Website run localhost ${PORT} PORT`);
});
