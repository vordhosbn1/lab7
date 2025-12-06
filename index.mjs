import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import session from 'express-session';

const app = express();

//session configuration
app.set('trust proxy', 1) // trust first proxy
app.use(session({
    secret: 'cst336 csumb',
    resave: false,
    saveUninitialized: true
    //   cookie: { secure: true }  //only works in web servers
}))

app.use((req, res, next) => {
    res.locals.fullName = req.session.fullName || null;
    res.locals.isUserAuthenticated = !!req.session.isUserAuthenticated;
    next();
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
//for Express to get values using the POST method
app.use(express.urlencoded({ extended: true }));
//setting up database connection pool
const pool = mysql.createPool({
    host: "blonze2d5mrbmcgf.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "b97smy96oqfdk3k7",
    password: "blf4iq50oouz3klb",
    database: "t36g5dx2gs9g2xpp",
    connectionLimit: 10,
    waitForConnections: true
});

//let isUserAuthenticated = false;

//routes
app.get('/', (req, res) => {
    res.render('login.ejs')
});

app.get('/home', isUserAuthenticated, (req, res) => {
    res.render('home.ejs');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/profile', isUserAuthenticated, (req, res) => {
    res.render('profile.ejs')
    //    if (req.session.isUserAuthenticated) {
    //     res.render('profile.ejs')
    //    } else {
    //     res.redirect("/");
    //    }
});

app.get('/newRoute', isUserAuthenticated, (req, res) => {
    res.render("newView.ejs")
});



// Author Routes
app.get('/authors', isUserAuthenticated, async (req, res) => {
    const [authors] = await pool.query(
        "SELECT * FROM authors ORDER BY lastName, firstName"
    );
    res.render('authors.ejs', { authors });
});


app.get('/authors/new', isUserAuthenticated, (req, res) => {
    res.render('authorForm.ejs', { author: null });
});


app.post('/authors/new', isUserAuthenticated, async (req, res) => {
    const {
        firstName,
        lastName,
        dob,
        dod,
        sex,
        profession,
        country,
        portrait,
        biography
    } = req.body;

    await pool.execute(
        `INSERT INTO authors
      (firstName, lastName, dob, dod, sex, profession, country, portrait, biography)
     VALUES (?,?,?,?,?,?,?,?,?)`,
        [
            firstName,
            lastName,
            dob || null,
            dod || null,
            sex || null,
            profession || null,
            country || null,
            portrait || null,
            biography || null
        ]
    );

    res.redirect('/authors');
});

app.get('/authors/:id/edit', isUserAuthenticated, async (req, res) => {
    const id = req.params.id;
    const [rows] = await pool.query(
        "SELECT * FROM authors WHERE authorId = ?",
        [id]
    );
    if (!rows.length) {
        return res.redirect('/authors');
    }

    res.render('authorForm.ejs', { author: rows[0] });
});


app.post('/authors/:id/edit', isUserAuthenticated, async (req, res) => {
    const id = req.params.id;
    const {
        firstName,
        lastName,
        dob,
        dod,
        sex,
        profession,
        country,
        portrait,
        biography
    } = req.body;

    await pool.execute(
        `UPDATE authors
        SET firstName = ?, lastName = ?, dob = ?, dod = ?, sex = ?,
            profession = ?, country = ?, portrait = ?, biography = ?
      WHERE authorId = ?`,
        [
            firstName,
            lastName,
            dob || null,
            dod || null,
            sex || null,
            profession || null,
            country || null,
            portrait || null,
            biography || null,
            id
        ]
    );

    res.redirect('/authors');
});

// Delete author
app.post('/authors/:id/delete', isUserAuthenticated, async (req, res) => {
    const id = req.params.id;
    await pool.execute("DELETE FROM authors WHERE authorId = ?", [id]);
    res.redirect('/authors');
});



// Quotes Routes
app.get('/quotes', isUserAuthenticated, async (req, res) => {
    const [quotes] = await pool.query(`
    SELECT
      q.quoteId,
      q.quote       AS quoteText,
      q.category,
      q.likes,
      a.authorId,
      a.firstName,
      a.lastName
    FROM quotes q
    JOIN authors a ON q.authorId = a.authorId
    ORDER BY a.lastName, a.firstName
  `);

    res.render('quotes.ejs', { quotes });
});


app.get('/quotes/new', isUserAuthenticated, async (req, res) => {
    const [authors] = await pool.query(
        "SELECT authorId, firstName, lastName FROM authors ORDER BY lastName, firstName"
    );

    const [categoryRows] = await pool.query(
        "SELECT DISTINCT category FROM quotes WHERE category IS NOT NULL AND category <> '' ORDER BY category"
    );
    const categories = categoryRows.map(r => r.category);

    res.render('quoteForm.ejs', {
        quote: null,
        authors,
        categories
    });
});


app.post('/quotes/new', isUserAuthenticated, async (req, res) => {
    const { quoteText, authorId, category, likes } = req.body;

    await pool.execute(
        "INSERT INTO quotes (quote, authorId, category, likes) VALUES (?,?,?,?)",
        [quoteText, authorId, category || null, likes || 0]
    );

    res.redirect('/quotes');
});


app.get('/quotes/:id/edit', isUserAuthenticated, async (req, res) => {
    const id = req.params.id;

    const [qRows] = await pool.query(
        "SELECT quoteId, quote AS quoteText, authorId, category, likes FROM quotes WHERE quoteId = ?",
        [id]
    );
    if (!qRows.length) {
        return res.redirect('/quotes');
    }

    const quote = qRows[0];

    const [authors] = await pool.query(
        "SELECT authorId, firstName, lastName FROM authors ORDER BY lastName, firstName"
    );

    const [categoryRows] = await pool.query(
        "SELECT DISTINCT category FROM quotes WHERE category IS NOT NULL AND category <> '' ORDER BY category"
    );
    const categories = categoryRows.map(r => r.category);

    res.render('quoteForm.ejs', {
        quote,
        authors,
        categories
    });
});


app.post('/quotes/:id/edit', isUserAuthenticated, async (req, res) => {
    const id = req.params.id;
    const { quoteText, authorId, category, likes } = req.body;

    await pool.execute(
        "UPDATE quotes SET quote = ?, authorId = ?, category = ?, likes = ? WHERE quoteId = ?",
        [quoteText, authorId, category || null, likes || 0, id]
    );

    res.redirect('/quotes');
});


app.post('/quotes/:id/delete', isUserAuthenticated, async (req, res) => {
    const id = req.params.id;
    await pool.execute("DELETE FROM quotes WHERE quoteId = ?", [id]);
    res.redirect('/quotes');
});



app.post('/loginProcess', async (req, res) => {
    const { username, password } = req.body;

    // Simple username+password check against DB
    const sql = `SELECT *
                 FROM users
                 WHERE username = ? AND password = ?`;

    const [rows] = await pool.query(sql, [username, password]);

    if (rows.length > 0) {
        // Successful login
        req.session.isUserAuthenticated = true;
        req.session.fullName = rows[0].firstName + " " + rows[0].lastName;
        res.redirect('/home');
    } else {
        // Invalid credentials
        res.render('login.ejs', { loginError: "Wrong Credentials" });
    }
});

app.get("/dbTest", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT CURDATE()");
        res.send(rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});//dbTest

//middleware functions

function isUserAuthenticated(req, res, next) {
    if (req.session.isUserAuthenticated) {
        next();
    } else {
        res.redirect("/");
    }
}

app.listen(3000, () => {
    console.log("Express server running")
})