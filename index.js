const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const neo4j = require("neo4j-driver");

const driver = neo4j.driver("bolt://100.25.153.235:34990", neo4j.auth.basic("neo4j", "coordination-maples-appropriations"));
const session = driver.session();

const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

app.get("/", (req, res) => res.sendFile(path.join(__dirname + "/public/index.html")));

app.route("/cliente/:cpf")
    .get(async (req, res) => {
        const cpf = req.params.cpf;
        const result = await session.run(
            "MATCH (c:Cliente {cpf:$cpf}) RETURN c",
            {
                cpf: cpf
            });
        if (result.records.length > 0) {
            res.status(200).send(result.records[0].get(0).properties);
        }
        else {
            res.sendStatus(404);
        }
    });

app.route("/cliente")
    .get(async (req, res) => {
        const cpf = req.query.cpf;
        const nome = req.query.nome;
        const email = req.query.email;
        const telefone = req.query.telefone;

        let props = [];
        if (cpf) props.push("cpf:$cpf");
        if (nome) props.push("nome:$nome");
        if (email) props.push("email:$email");
        if (telefone) props.push("telefone:$telefone");

        let query = "MATCH (c:Cliente";
        if (props.length > 0) query += " {" + props.join(", ") + "}";
        query += ") RETURN c";

        const result = await session.run(
            query,
            {
                cpf: cpf,
                nome: nome,
                email: email,
                telefone: telefone
            });
        if (result.records.length > 0) {
            const clientes = result.records.map(record => {
                return record.get(0) && record.get(0).properties;
            });
            res.status(200).send(clientes);
        }
        else {
            res.sendStatus(404);
        }
    })
    .post(async (req, res) => {
        const cliente = req.body;
        await session.run(
            "MERGE (c:Cliente {cpf:$cpf}) " +
            "ON CREATE SET c.nome = $nome, c.email = $email, c.telefone = $telefone " +
            "ON MATCH SET c.nome = $nome, c.email = $email, c.telefone = $telefone",
            {
                cpf: cliente.cpf,
                nome: cliente.nome,
                email: cliente.email,
                telefone: cliente.telefone || null
            });
        res.sendStatus(204);
    })
    .delete(async (req, res) => {
        const cpf = req.query.cpf;
        await session.run(
            "MATCH (c:Cliente {cpf:$cpf})" +
            "DELETE c",
            {
                cpf: cpf
            });
        res.sendStatus(204);
    });


app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
