const { Pool } = require('pg');
const express = require('express');
const router = express.Router();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'modulo_5_leccion_1_ejercicio_1',
  password: 'Anahata4',
  port: 5432,
});

const Producto = {
  async find(filter) {
    const query = `
      SELECT * FROM productos 
      WHERE nombre ILIKE '%${filter}%' 
      ORDER BY nombre ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  async findById(id) {
    const query = `
      SELECT * FROM productos 
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }
};

const Cliente = {
  async find(filter) {
    const query = `
      SELECT * FROM clientes 
      WHERE nombre ILIKE '%${filter}%' 
      ORDER BY nombre ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
  },
  async findByRut(rut) {
    const query = `
      SELECT * FROM clientes
      WHERE rut = '${rut}'
    `;
    const { rows } = await pool.query(query);
    return rows[0];
  },
  async findDireccionesByRut(rut) {
    const query = `
      SELECT * FROM direcciones
      WHERE rut_cliente = '${rut}'
    `;
    const { rows } = await pool.query(query);
    return rows;
  },
};

//get para listar productos
router.get('/productos', async (req, res) => {
  try {
    const query = 'SELECT * FROM productos ORDER BY nombre ASC';
    const { rows } = await pool.query(query);
    res.render('productos', { productos: rows });
  } catch (error) {
    console.error('Error al obtener la lista de productos', error);
    res.status(500).send('Error al obtener la lista de productos');
  }
});
module.exports = router;

//get para listar productos id
router.get('/productos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const producto = await Producto.findById(id);
    res.json(producto);
  } catch (error) {
    console.error('Error al obtener el producto', error);
    res.status(500).send('Error al obtener el producto');
  }
});

module.exports = router;
  
  //get para listar productos orden
  app.get('/productos', async (req, res) => {
    try {
      const filtro = req.query.filtro || '';
      const ordenId = req.query.orden || '';
      
      let productos = [];
      if (ordenId) {
        const query = `
          SELECT productos.*
          FROM ordenes_productos
          INNER JOIN productos
          ON ordenes_productos.producto_id = productos.id
          WHERE ordenes_productos.orden_id = $1
        `;
        const { rows } = await pool.query(query, [ordenId]);
        productos = rows;
      } else {
        const query = `
          SELECT * FROM productos 
          WHERE nombre ILIKE '%${filtro}%' 
          ORDER BY nombre ASC
        `;
        const { rows } = await pool.query(query);
        productos = rows;
      }
      
      res.json(productos);
    } catch (error) {
      console.error('Error al obtener la lista de productos', error);
      res.status(500).send('Error al obtener la lista de productos');
    }
  });
  
    //get para listar productos orden rut
  app.get('/ordenes', async (req, res) => {
    try {
      const rut = req.query.rut || '';
      const ordenes = await Orden.findByRut(rut);
      res.json(ordenes);
    } catch (error) {
      console.error('Error al obtener la lista de órdenes', error);
      res.status(500).send('Error al obtener la lista de órdenes');
    }
  });
  //get para listar clientes
  app.get('/clientes', async (req, res) => {
    try {
      const filtro = req.query.filtro || '';
      const clientes = await Cliente.find(filtro);
      res.json(clientes);
    } catch (error) {
      console.error('Error al obtener la lista de clientes', error);
      res.status(500).send('Error al obtener la lista de clientes');
    }
  });
 //get para listar clientes rut
  app.get('/clientes', async (req, res) => {
    try {
      const filtro = req.query.filtro || '';
      if (req.query.rut) {
        const cliente = await Cliente.findByRut(req.query.rut);
        res.json(cliente);
      } else {
        const clientes = await Cliente.find(filtro);
        res.json(clientes);
      }
    } catch (error) {
      console.error('Error al obtener la lista de clientes', error);
      res.status(500).send('Error al obtener la lista de clientes');
    }
  });
//get para listar direcciones rut
  app.get('/clientes/:rut/direcciones', async (req, res) => {
    try {
      const rut = req.params.rut;
      const direcciones = await Cliente.findDireccionesByRut(rut);
      res.json(direcciones);
    } catch (error) {
      console.error('Error al obtener las direcciones del cliente', error);
      res.status(500).send('Error al obtener las direcciones del cliente');
    }
  });
//get para despacho asociado a la orden especificada mediante su <id>
  app.get('/despachos', async (req, res) => {
    try {
      const idOrden = req.query.orden;
      const query = `
        SELECT * FROM despachos 
        WHERE id_orden = ${idOrden}
      `;
      const { rows } = await pool.query(query);
      res.json(rows[0]);
    } catch (error) {
      console.error('Error al obtener el despacho de la orden', error);
      res.status(500).send('Error al obtener el despacho de la orden');
    }
  });

  app.post('/ordenes', async (req, res) => {
    const { rut, direccion, productos } = req.body;
    const client = await pool.connect();
  
    try {
      await client.query('BEGIN');
      // Insertar dirección de despacho
      const queryDireccion = `
        INSERT INTO direcciones (rut_cliente, direccion)
        VALUES ($1, $2)
        RETURNING id
      `;
      const { rows: [{ id_direccion }] } = await client.query(queryDireccion, [rut, direccion]);
      
      // Insertar despacho
      const queryDespacho = `
        INSERT INTO despachos (id_direccion)
        VALUES ($1)
        RETURNING id
      `;
      const { rows: [{ id_despacho }] } = await client.query(queryDespacho, [id_direccion]);
  
      // Insertar orden
      const queryOrden = `
        INSERT INTO ordenes (rut_cliente, id_despacho)
        VALUES ($1, $2)
        RETURNING id
      `;
      const { rows: [{ id_orden }] } = await client.query(queryOrden, [rut, id_despacho]);
  
      // Insertar productos y actualizar existencias
      for (const { id_producto, cantidad } of productos) {
        const queryProducto = `
          SELECT existencias FROM productos WHERE id = $1 FOR UPDATE
        `;
        const { rows: [{ existencias }] } = await client.query(queryProducto, [id_producto]);
        if (existencias < cantidad) {
          throw new Error(`No hay suficientes existencias para el producto ${id_producto}`);
        }
        const queryUpdateProducto = `
          UPDATE productos SET existencias = existencias - $1 WHERE id = $2
        `;
        await client.query(queryUpdateProducto, [cantidad, id_producto]);
        const queryDetalleOrden = `
          INSERT INTO detalle_ordenes (id_orden, id_producto, cantidad)
          VALUES ($1, $2, $3)
        `;
        await client.query(queryDetalleOrden, [id_orden, id_producto, cantidad]);
      }
  
      await client.query('COMMIT');
      res.send('Orden creada exitosamente');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Error al crear la orden', e);
      res.status(500).send('Error al crear la orden');
    } finally {
      client.release();
    }
  });
  

