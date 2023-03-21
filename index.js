const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const app = express();
const exphbs = require('express-handlebars');

const port = 3000;

app.engine('hbs', exphbs.engine({
  defaultLayout: 'layouts/main',
  extname: '.hbs',
  layoutsDir: __dirname + '/views',
  partialsDir: __dirname + '/views/partials'
}));

app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

app.use(bodyParser.urlencoded({ extended: false }));

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'modulo_5_leccion_1_ejercicio_1',
  password: 'Anahata4',
  port: 5432,
});

pool.connect()
  .then(() => {
    console.log('Conexión a la base de datos establecida');
  })
  .catch((error) => {
    console.error('Error al conectarse a la base de datos', error);
  });

// Rutas
app.get('/', (req, res) => {
  res.render('home');
});

app.get('/productos', (req, res) => {
  res.render('productos');
});

app.get('/ordenes', (req, res) => {
  res.render('ordenes');
});

app.get('/clientes', (req, res) => {
  res.render('clientes');
});

app.get('/perfil', (req, res) => {
  res.render('perfil');
});

app.get('/crear-orden', (req, res) => {
  res.render('crear-orden');
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

//traer prodcutos
app.get('/filtrar/:filtro', async (req, res) => {
  const filtro = req.params.filtro;
  if (filtro === 'productos') {
    try {
      const query = 'SELECT * FROM productos ORDER BY nombre ASC';
      const { rows } = await pool.query(query);
      res.render('productos', { products: rows });
    } catch (error) {
      console.error('Error al obtener la lista de productos', error);
      res.status(500).send('Error al obtener la lista de productos');
    }
  } else {
    res.status(404).send('No se encontró el filtro especificado');
  }
});

//ordenes por cliente
app.get('/ordenes/:rut', (req, res) => {
  const rut = req.params.rut;
  pool.query('SELECT * FROM ordenes WHERE cliente_rut = $1', [rut], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al obtener las órdenes');
    } else {
      res.render('ordenes', { orders: result.rows });
    }
  });
});

// aca nose por que no me funciona buscando en el buscador el rut, pero si lo coloco en la URL si trae la informacion por ej: http://localhost:3000/ordenes/123456789
app.get('/ordenes', (req, res) => {
  const rut = req.query.rut;
  if (rut) {
    pool.query('SELECT * FROM ordenes WHERE cliente_rut = $1', [rut], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error al obtener las órdenes');
      } else {
        res.render('ordenes', { orders: result.rows });
      }
    });
  } else {
    pool.query('SELECT * FROM ordenes', (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error al obtener las órdenes');
      } else {
        res.render('ordenes', { orders: result.rows });
      }
    });
  }
});

// Ruta para mostrar todos los clientes
app.get('/clientes', async (req, res) => {
  try {
    const query = 'SELECT * FROM clientes';
    const { rows } = await pool.query(query);
    res.render('clientes', { clientes: rows });
  } catch (error) {
    console.error('Error al obtener la lista de clientes', error);
    res.status(500).send('Error al obtener la lista de clientes');
  }
});

// Ruta para obtener la información de los clientes y sus órdenes
app.get('/clientes', async (req, res) => {
  try {
    const query = `
      SELECT c.rut, c.nombre AS cliente_nombre, d.direccion, o.id AS orden_id, o.fecha, op.cantidad, p.nombre AS producto_nombre, p.precio_unitario
      FROM clientes c
      INNER JOIN direcciones d ON c.rut = d.cliente_rut
      INNER JOIN ordenes o ON c.rut = o.cliente_rut
      INNER JOIN ordenes_productos op ON o.id = op.orden_id
      INNER JOIN productos p ON op.producto_id = p.id
      ORDER BY c.rut, o.fecha, o.id, p.nombre ASC;
    `;
    const { rows } = await pool.query(query);

    const clientes = {};

    // Estructuramos los resultados por cliente
    for (let row of rows) {
      const rut = row.rut;
      const direccion = row.direccion;
      const ordenId = row.orden_id;
      const ordenFecha = row.fecha;
      const producto = {
        nombre: row.producto_nombre,
        cantidad: row.cantidad,
        precioUnitario: row.precio_unitario
      };

      if (!clientes[rut]) {
        // Si es la primera orden del cliente, creamos su objeto y agregamos la dirección
        clientes[rut] = {
          nombre: row.cliente_nombre,
          direcciones: [direccion],
          ordenes: [
            {
              id: ordenId,
              fecha: ordenFecha,
              productos: [producto],
              total: producto.cantidad * producto.precioUnitario
            }
          ]
        };
      } else {
        // Si ya existe el cliente, agregamos la dirección si no está registrada
        if (!clientes[rut].direcciones.includes(direccion)) {
          clientes[rut].direcciones.push(direccion);
        }

        // Agregamos la orden y el producto
        const ultimaOrden = clientes[rut].ordenes[clientes[rut].ordenes.length - 1];
        if (ultimaOrden.id === ordenId) {
          // Si es la misma orden, agregamos el producto
          ultimaOrden.productos.push(producto);
          ultimaOrden.total += producto.cantidad * producto.precioUnitario;
        } else {
          // Si es una orden nueva, la agregamos
          clientes[rut].ordenes.push({
            id: ordenId,
            fecha: ordenFecha,
            productos: [producto],
            total: producto.cantidad * producto.precioUnitario
          });
        }
      }
    }

    res.render('clientes', { clientes: clientes });
  } catch (error) {
    console.error('Error al obtener la información de los clientes', error);
    res.status(500).send('Error al obtener la información de los clientes');
  }
});

// Ruta para crear una nueva orden
app.post('/crear-orden', async (req, res) => {
  // Obtener los datos del formulario
  const rut = req.body.rut;
  const direccionEntrega = req.body.direccion_entrega;
  const productos = req.body.productos;

  // Verificar que haya suficientes cantidades disponibles de los productos seleccionados
  try {
    const productosIds = productos.map((p) => p.id);
    if (!productos || productos.length === 0) {
      res.status(400).send('No se proporcionaron productos para crear la orden');
      return;
    }
  
    
    
    const query = 'SELECT id, stock FROM productos WHERE id = ANY($1)';
    const { rows } = await pool.query(query, [productosIds]);
    const cantidadesSuficientes = rows.every((p) => {
      const productoSeleccionado = productos.find((ps) => ps.id === p.id);
      return productoSeleccionado.cantidad <= p.stock;
    });
    if (!cantidadesSuficientes) {
      res.status(400).send('No hay suficientes cantidades disponibles de los productos seleccionados');
      return;
    }
  } catch (error) {
    console.error('Error al verificar cantidades de productos', error);
    res.status(500).send('Error al crear la orden');
    return;
  }

  // Restar la cantidad seleccionada de cada producto del inventario en la base de datos
  try {
    const productosIds = productos.map((p) => p.id);
    const query = 'UPDATE productos SET stock = stock - $1 WHERE id = $2';
    await Promise.all(productos.map(async (p) => {
      await pool.query(query, [p.cantidad, p.id]);
    }));
  } catch (error) {
    console.error('Error al restar cantidades de productos', error);
    res.status(500).send('Error al crear la orden');
    return;
  }

  // Crear una nueva orden en la tabla de órdenes con los detalles proporcionados
  try {
    const total = productos.reduce((acc, p) => acc + p.cantidad * p.precio_unitario, 0);
    const fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const insertQuery = 'INSERT INTO ordenes (cliente_rut, direccion_entrega, fecha, total) VALUES ($1, $2, $3, $4) RETURNING id';
    const { rows } = await pool.query(insertQuery, [rut, direccionEntrega, fecha, total]);
    const orderId = rows[0].id;
    const insertDetalleQuery = 'INSERT INTO ordenes_detalle (orden_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)';
    await Promise.all(productos.map(async (p) => {
    await pool.query(insertDetalleQuery, [orderId, p.id, p.cantidad, p.precio_unitario]);
    }));
    } catch (error) {
    console.error('Error al crear la orden', error);
    res.status(500).send('Error al crear la orden');
    return;
    }
    
    // Redirigir a la página de órdenes del cliente
    res.redirect('/ordenes');
    });
    
    // Ruta para obtener el formulario de creación de órdenes
    app.get('/crear-orden', async (req, res) => {
    try {
    const query = 'SELECT id, nombre, precio_unitario, stock FROM productos';
    const { rows } = await pool.query(query);
    res.render('crear-orden', { productos: rows });
    } catch (error) {
    console.error('Error al obtener la lista de productos', error);
    res.status(500).send('Error al obtener la lista de productos');
    }
    });
    
    // Ruta para manejar errores de formularios
    app.post('/form-error', (req, res) => {
    const errorMsg = req.body.errorMsg;
    res.status(400).send(errorMsg);
    });


    document.querySelectorAll('.agregar-producto').forEach((boton) => {
      boton.addEventListener('click', () => {
        const productoId = boton.dataset.productoId;
        const cantidad = 1; // Puedes cambiar esto para permitir al usuario seleccionar una cantidad
        const inputCantidad = document.querySelector(`input[name="productos[${productoId}][cantidad]"]`);
        inputCantidad.value = Number(inputCantidad.value) + cantidad;
      });
    });
    





