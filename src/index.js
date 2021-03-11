const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(cors());
app.use(express.json());

const customers = [];

function checksExistsCustomerAccountCPF(request, response, next) {
  const { cpf } = request.headers;
  const customer = customers.find((customer) => customer.cpf === cpf);
  if (!customer) {
    return response.status(400).json({ error: "Customer account not found" });
  }
  request.customer = customer;
  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);
  return balance;
}

app.post("/account", (request, response) => {
  const { name, cpf } = request.body;

  const customersExists = customers.some((customer) => customer.cpf === cpf);

  if (customersExists) {
    return response
      .status(400)
      .json({ error: "Customer account already exists" });
  }

  const newAccount = {
    id: uuidv4(),
    name,
    cpf,
    statement: [],
  };

  customers.push(newAccount);

  return response.status(201).json(newAccount);
});

app.get("/statement", checksExistsCustomerAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer.statement);
});

app.post("/deposit", checksExistsCustomerAccountCPF, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    type: "credit",
    created_at: new Date(),
  };

  customer.statement.push(statementOperation);

  const balance = getBalance(customer.statement);

  return response.status(200).json({ statementOperation, balance });
});

app.post("/withdraw", checksExistsCustomerAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: "Insufficient funds" });
  }

  const statementOperation = {
    amount,
    type: "debit",
    created_at: new Date(),
  };

  customer.statement.push(statementOperation);

  const newBalance = getBalance(customer.statement);

  return response.status(200).json({ statementOperation, balance: newBalance });
});

app.get(
  "/statement/date",
  checksExistsCustomerAccountCPF,
  (request, response) => {
    const { date } = request.query;
    const { customer } = request;

    const dateFormatted = new Date(date + " 00:00");

    const statementByDate = customer.statement.filter(
      (statement) =>
        statement.created_at.toDateString() ===
        new Date(dateFormatted).toDateString()
    );

    return response.json(statementByDate);
  }
);

app.put("/account", checksExistsCustomerAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
});

app.get("/account", checksExistsCustomerAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer);
});

app.delete("/account", checksExistsCustomerAccountCPF, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.json(customers);
});

app.get("/balance", checksExistsCustomerAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json({ balance });
});

app.listen(3333, () => console.log("FINACE API running on port 3333"));
