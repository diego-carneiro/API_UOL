import express, { json } from "express";
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import joi from 'joi';

dotenv.config();
const server = express();
server.use(cors());
server.use(json());

const userSchema = joi.object({ 
    name: joi.string().required()
});

const mongoClient = new MongoClient(process.env.MONGO_URI);
console.log(process.env.MONGO_URI);
server.get('/participants', (request, response) => {

    const { name } = request.body;


    const promise = mongoClient.connect();

    promise.then(connectedMongoClient => {
        console.log("Conexão realizada");
    });
    promise.catch(error => {
        console.log("Erro de conexão com o Mongo");
    });

});

server.post('/participants', (request, response) => {
    const promise = mongoClient.connect();

    promise.then(connectedMongoClient => {
        console.log("Conexão realizada");
    });
    promise.catch(error => {
        console.log("Erro de conexão com o Mongo");
    });


});

server.listen(5000, () => {
    console.log("Running at http://localhost:5000")
    console.log(process.env.MONGO_URI);
});