import express, { json } from "express";
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';


dotenv.config();
const server = express();
server.use(cors());
server.use(json());

const userSchema = joi.object({
    name: joi.string().required()
});

const messagesSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.valid('message', 'private_message').required()
});

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("APIUOL")
});

server.get('/participants', async (_request, response) => {
    try {
        const participants = await db.collection("participants").find({}).toArray();
        response.status(200).send(participants);

    } catch (error) {
        console.log(error, "participants get error");
        response.sendStatus(500);
    }
});

server.post('/participants', async (request, response) => {
    const { name } = request.body;

    try {
        const validation = userSchema.validate(request.body);

        if (validation.error) {
            return response.status(422).send(validation.error.details);
        }

        const isReagistered = await db.collection('participants').findOne({ name });

        if (isReagistered) {
            return response.status(409).send("Nome de usuário indisponível")
        }

        const moment = dayjs().locale('pt-br').format('HH:mm:ss');

        await db.collection('participants').insertOne(
            {
                "name": name,
                "lastStatus": Date.now()
            }
        );

        await db.collection('messages').insertOne(
            {
                "from": name,
                "to": "Todos",
                "text": "entra na sala...",
                "type": "message",
                "time": moment,
            }
        );
        response.sendStatus(201);

    } catch (error) {
        console.error(error, "Error posting name");
        response.sendStatus(500);
    }
});

server.get('/messages', async (request, response) => {
    const validated = userSchema.validate({ name: req.header.user });

    if (validated.error) {
        return response.status(422).send(validated.error.details);
    }

    const { user } = request.headers;
    const { limit } = request.query;

    try {
        const messages = await db.collection('messages').find({ user }).toArray();

        const arrangeMessages = [...messages].reverse();

        const filteredMessages = arrangeMessages.filter((message) =>
            message.type === "message" ||
            message.from === user ||
            message.to === user
        );

        if (limit) {

            const maxMessages = [...filteredMessages].slice(0, parseInt(limit));

            response.status(200).send(maxMessages);
        }

    } catch (error) {
        console.error(error);
        response.sendStatus(500);
    }
});

server.post('/messages', async (request, response) => {
    const { to, text, type } = request.body;
    const { User } = request.headers;

    try {

        const validation = messagesSchema.validate(request.body);

        if (validation.error) {
            return response.status(422).send(validation.error.details);
        }

        const isRegistered = await db.collection("participants").findOne({});

        if (!isRegistered) {
            return response.status(422).send()
        }

        const moment = dayjs().locale('pt-br').format('HH:mm:ss');

        await db.collection('messages').insertOne(
            {
                "from": User,
                "to": to,
                "text": text,
                "type": type,
                "time": moment,
            }
        );
        response.sendStatus(201);

    } catch (error) {
        console.error(error);
        response.sendStatus(500);
    }
});

server.post("/status", async (request, response) => {
    const { user } = request.headers;

    try {
        const validParticipant = await db.collection("participants").findOne({ name: user });

        if (!validParticipant || !user) {
            return response.sendStatus(404);
        }

        await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
        response.sendStatus(200);

    } catch (error) {
        console.error(error);
        response.sendStatus(500);
    }
});


async function removeInactive() {
    const participants = await db.collection("participants").find({}).toArray();
    const moment = dayjs().locale("pt-br").format("HH:mm:ss");

    participants.forEach(async (participant) => {
        if (Date.now() - participant.lastStatus > 10000) {
            await db.collection("messages").insertOne({
                from: participant.name,
                to: "Todos",
                text: "sai da sala...",
                type: "status",
                time: moment,
            });

            await db.collection("participants").deleteOne({
                _id: new ObjectId(participant._id),
            });
        }
    });
}

setInterval(removeInactive, 15000);

server.listen(5000, () => {
    console.log("Running at http://localhost:5000")
});