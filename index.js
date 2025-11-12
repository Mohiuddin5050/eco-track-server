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
    const usersCollection = db.collection("users");
    const userChallengesCollection = db.collection("userChallenges");

    //get all challenges
    app.get("/challenges", async (req, res) => {
      const data = await challengesCollection.find().toArray();
      res.send(data);
    });

    //get all challenges
    app.get("/challenges/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      //   console.log(id);
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

    app.patch("/challenges/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { email } = req.body;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        const query = { _id: new ObjectId(id) };

        // Increment participants
        const updateChallenge = await challengesCollection.updateOne(query, {
          $inc: { participants: 1 },
        });

        // Insert into userChallenges
        const newUserChallenge = {
          userEmail: email,
          challengeId: new ObjectId(id),
          status: "Ongoing",
          progress: 0,
          joinDate: new Date().toISOString(),
        };

        const insertResult = await userChallengesCollection.insertOne(
          newUserChallenge
        );

        res.send({
          success: true,
          message: "Challenge joined successfully",
          challengeUpdate: updateChallenge,
          userChallenge: insertResult,
        });
      } catch (error) {
        console.error("Error joining challenge:", error);
        res.status(500).send({ message: "Failed to join challenge" });
      }
    });

    //delete challenge
    app.delete("/challenges/:id", async (req, res) => {
      const id = req.params.id;
      const { email } = req.body;
      console.log(email);
      const query = { _id: new ObjectId(id) };
      const data = await challengesCollection.deleteOne(query);
      res.send(data);
    });

    //get user challenge details

    app.get("/userChallenges/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const pipeline = [
          {
            $match: { userEmail: email },
          },
          {
            $lookup: {
              from: "challenges",
              localField: "challengeId",
              foreignField: "_id",
              as: "challengeInfo",
            },
          },
          {
            $unwind: "$challengeInfo",
          },
          {
            $project: {
              _id: 1,
              userEmail: 1,
              status: 1,
              progress: 1,
              joinDate: 1,
              "challengeInfo.title": 1,
              "challengeInfo.category": 1,
              "challengeInfo.imageUrl": 1,
              "challengeInfo.impactMetric": 1,
              "challengeInfo.duration": 1,
            },
          },
        ];

        const data = await userChallengesCollection
          .aggregate(pipeline)
          .toArray();
        res.send(data);
      } catch (error) {
        console.error("Error fetching user activities:", error);
        res.status(500).send({ message: "Failed to fetch user activities" });
      }
    });

    // uptate user challenge
    app.patch("/userChallenges/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;

        // Validate input
        const validStatuses = ["Not Started", "Ongoing", "Finished"];
        if (!validStatuses.includes(status)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid status value" });
        }

        // progress
        let progress = 0;
        if (status === "Ongoing") progress = 50;
        if (status === "Finished") progress = 100;

        const result = await userChallengesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status, progress } }
        );

        if (result.modifiedCount === 1) {
          res.send({
            success: true,
            message: "Challenge progress updated successfully",
            status,
            progress,
          });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Challenge not found" });
        }
      } catch (error) {
        console.error("Error updating user challenge:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to update progress" });
      }
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
