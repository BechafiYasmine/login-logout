import express from 'express';
import mysql from 'mysql';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
const salt =10;

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:5173"],
    methods: ["POST", "GET"],
    credentials: true
}));
app.use(cookieParser());

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'bechafiyasmine',
    database: process.env.DB_NAME || 'signup'
}); 

const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.json({ Error: "You are not authenticated" });
    } else {
        jwt.verify(token, "jwt-secret-key", (err, decoded) => {
            if (err) {
                return res.json({ Error: "Token is not okay" });
            } else {
                req.name = decoded.name;
                next();
            }
        });
    }
};

//This middleware function (verifyUser) checks if a JWT token is present in the request cookies.

//If no token is found, it returns an authentication error.

//If a token is present, it verifies it using jwt.verify().

//If verification fails, it sends an error message.

//If the token is valid, it attaches the decoded username (decoded.name) to the request (req.name) and calls next(), allowing the request to continue.

//The app.get() route applies the verifyUser middleware before handling the request.

app.get('/', verifyUser, (req, res) => {
    return res.json({ Status: "Success", name: req.name , role: req.role});
});

//app.get('/'): Defines a GET route at the root (/).

//verifyUser: Middleware function that checks authentication before proceeding.

//(req, res) => { ... }: Route handler that executes after authentication.

//res.json({ Status: "Success", name: req.name }):

//If the user is authenticated, it returns a Success response.

//req.name comes from the verifyUser middleware, where the JWT token is decoded.

app.post('/register', (req, res) => {
    const sql = "INSERT INTO users (`name`, `email`, `password`) VALUES (?)";

    bcrypt.hash(req.body.password.toString(), salt, (err, hash) => {
        if (err) return res.json({ Error: "Error hashing password" });

        const values = [
            req.body.name,
            req.body.email,
            hash
        ];

        db.query(sql, [values], (err, result) => {
            if (err) {
                console.error("SQL Error: ", err);  // Ajoute ceci pour voir l'erreur dans le terminal
                return res.json({ Error: err.sqlMessage });
            }
            return res.json({ Status: "Success" });
        });
    });
});

app.post('/login', (req, res) => {
    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [req.body.email], (err, data) => {
        if(err) return res.json({Error: "Login error in server"});

        if(data.length > 0) {
            bcrypt.compare(req.body.password.toString(), data[0].password, (err, response) => {
                if(err) return res.json({Error: "Password compare error"});

                if(response) {
                    const name = data[0].name;
                    const role = data[0].role;
                    const token = jwt.sign({name , role}, "jwt-secret-key", {expiresIn: '1d'});
                    res.cookie('token', token);//we have 3 to do 
                    return res.json({Status: "Success" , name: name, role: role});
     
                    
                } else {
                    return res.json({Error: "Password not matched"});
                }
            })
        } else {
            return res.json({Error: "No email existed"});
        }
    });
});

app.get('/logout', (req, res) => {
    res.clearCookie('token'); // Clear the authentication token cookie
    return res.json({ Status: "Success" });
});
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Sample Route
app.get('/', (req, res) => {
    res.send('Server is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

