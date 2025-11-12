const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
console.log(process.env);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uji33wc.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("server is running");
});

async function run() {
  try {
    await client.connect();

    const db = client.db("ecotrack_db");
    const challengesCollection = db.collection("challenges");
    const statisticsCollection = db.collection("statistics");
    const tipsCollection = db.collection("recentTips");
    const eventsCollection = db.collection("events");

    //get all challenges
    app.get("/challenges", async (req, res) => {
      const data = await challengesCollection.find().toArray();
      res.send(data);
    });

    //get all challenges
    app.get("/challenges/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(id);
      const data = await challengesCollection.findOne(query);
      res.send(data);
    });

    //get all statistics
    app.get("/static", async (req, res) => {
      const data = await statisticsCollection.find().toArray();
      res.send(data);
    });

    // active challenge card data
    app.get("/activeChallenges", async (req, res) => {
      const data = await challengesCollection.find().limit(4).toArray();
      res.send(data);
    });

    // recentTips card data
    app.get("/tips", async (req, res) => {
      const data = await tipsCollection.find().toArray();
      res.send(data);
    });

    // get events card data
    app.get("/eventCollection", async (req, res) => {
      const data = await eventsCollection.find().toArray();
      res.send(data);
    });

    // create challenge
    app.post("/challenges", async (req, res) => {
      const data = req.body;
      const result = await challengesCollection.insertOne(data);
      res.send(result);
    });

    //delete challenge
    app.delete("/challenges/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const data = await challengesCollection.deleteOne(query);
      res.send(data);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
