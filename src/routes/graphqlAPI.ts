import express from "express";
import userFacade from "../facades/userFacadeWithDB";
import * as mongo from "mongodb"
import setup from "../config/setupDB"
import GameUser from "../interfaces/GameUser";
import basicAuth from "../middlewares/basic-auth"
import {ApiError} from "../errors/apiError";

const graphqlHTTP = require('express-graphql');
const {buildSchema} = require('graphql');
const router = express.Router();
const USE_AUTHENTICATION = false;

(async function setupDB() {
    const client = await setup()
    await userFacade.setDatabase(client)
})()

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
  type User {
    name: String
    userName: String
    role: String
    password: String
  }
 
  input UserInput {
    name: String
    userName: String
    password: String
  }
  
  type Query {
    users : [User]!
  }
  
  type Mutation {
    createUser(input: UserInput): String
  }
`)

if (USE_AUTHENTICATION) {
    router.use(basicAuth)
}

router.use("/", (req: any, res, next) => {
  if (USE_AUTHENTICATION) {
    const role = req.role;
    if (role != "admin") {
      throw new ApiError("Not Authorized", 403)
    }
    next();
  }
})

// The root provides a resolver function for each API endpoint
const root = {
    users: async () => {
        const users = await userFacade.getAllUsers();
        return users.map((user) => {
            const {name, userName, role} = user;
            return {name, userName, role}
        });
    },
    createUser: async (inp: any) => {
        const {input} = inp;
        try {
            const newUser: GameUser = {
                name: input.name,
                userName: input.userName,
                password: input.password,
                role: "role"
            }
            return await userFacade.addUser(newUser);
        } catch (err) {
            throw err;
        }
    }

};

router.use('/', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
}));

module.exports = router;
