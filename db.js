const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  user: 'postgres',
  password: 'Anahata4',
  port: 5432,
  database: 'modulo_5_leccion_1_ejercicio_1'
});

client.connect();

module.exports = client;

const userId = 'postgres1';
const username = 'postgres';

connection.query('SELECT * FROM users WHERE id = ? AND username = ?', [userId, username], function (error, results, fields) {
  if (error) throw error;
  console.log('The solution is: ', results[0].solution);
});

connection.end();
