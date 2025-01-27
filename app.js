// Middleware for creating .env files to store environmental variables
import 'dotenv/config';
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
// Middleware for creating sessions in express. Works together with PassportJS to maintain sessions
import session from 'express-session';
// Middleware for managing PassportJS authentication strategies and sessions
import passport from 'passport';
// Part of the PassportJS middleware for local authentication strategy
import LocalStrategy from 'passport-local';
// Part of the PassportJS middleware for Google authentication strategy
import GoogleStrategy from 'passport-google-oauth20';

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PWD,
    port: process.env.DB_PORT
});
db.connect();

const app = express();
const port = process.env.EXPRESS_PORT;

// Initializing the express session with some parameters
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));

// Initializing an instance of the PassportJS and using it with the express app
app.use(passport.initialize());
// Attaching the express session to the passport
app.use(passport.session());

// Defining the local strategy using passport-local package
passport.use(new LocalStrategy (async(user, password, done) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE email=$1 AND pwd = crypt($2, pwd)", [user, password]);
        if(result.rowCount == 0){
            return done(null, false);
        } else {
            return done(null, result.rows[0]);
        }
    } catch (error) {
        return done(error);
    }
}));

// Defining the Google OAuth2.0 strategy using passport-google-oauth20 package
// The Google authentication strategy authenticates users using a Google account and OAuth 2.0 tokens
passport.use(new GoogleStrategy({
    // Client parameters that are obtained from setting up a client ID in Google
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  // The callback that handles the logic of the strategy
  async (accessToken, refreshToken, profile, done) => {
    const userData = profile._json;
    let user = {};
    // Applying the findOrCreate logic by creating a user if it does not exist
    try {
        const currentUserQuery = await db.query("SELECT * FROM users WHERE google_id = $1", [userData.sub]);
        if (currentUserQuery.rowCount > 0){
            user = {id: currentUserQuery.rows[0].id,
                    google_id: currentUserQuery.rows[0].google_id,
                    username: currentUserQuery.rows[0].username};
        } else {
            const newUser = await db.query(
                "INSERT INTO users (google_id, username) VALUES ($1, $2) RETURNING id, username",
                [userData.sub, userData.name]
            );
            user = {id: newUser.rows[0].id, google_id: newUser.rows[0].google_id, username: newUser.rows[0].username};
        }
        done(null, user);
    } catch (error) {
        done(error, false, error.message)
    }
  }
));

// Serializing users. i.e. adding users to the req.session.passport object to attach the authenticated user to the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

/* Deserializing users. i.e. adds the user from req.session.passport to req.users to obtain the unique user 
  attached to the session, in case we need to use that user's info in different parts of the code */
passport.deserializeUser(async(id, done) => {
    const result = await db.query("SELECT * FROM users WHERE id=$1", [id]);
    if (result.rowCount != 0){
        done(null, result.rows[0]);
    } else {
        done(null, false);
    }
});

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');

app.get("/", (req, res) => {
    res.render("home.ejs");
});

// Redirecting the authenticated user to the secrets page immediately if they are tring to access the login page
app.get("/login", (req, res) => {
    if (req.isAuthenticated()){
        res.redirect("/secrets");
    } else {
        res.render("login.ejs");
    }
});

/* Using Passport authentication when a user logs in. On successful authentication redirect the user to the secrets page that
   is not accessible otherwise */
app.post("/login", passport.authenticate('local', {
    successRedirect: "/secrets",
    failureRedirect: "/login",
}));

/* GETting the google authentication route, authenticating the user using their google credentials 
   and retrieving the user's profile (Set up in ClientID) on successful authentiucation */
app.get("/auth/google",
    passport.authenticate('google', { scope: ["profile"] })
);

// Redirecting Google authenticated users to the secrets page
app.get("/auth/google/secrets",
    passport.authenticate('google', { successRedirect: "/secrets", failureRedirect: "/login" })
);

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

/* Using Passport authentication for the registration POST route.
   On successful registration redirects the user to the secrets page that can't be accessed otherwise.
   If the user is authenticated redirect them immediately to secrets page */
app.post("/register", async(req, res) => {
    if (req.isAuthenticated()){
        res.redirect("/secrets");
    } else {
        try {
            await db.query(
                "INSERT INTO users (email, pwd) VALUES ($1, crypt($2, gen_salt($3, $4)))",
                [req.body.username, req.body.password, process.env.SALT, process.env.SALT_ROUNDS],
                (err, user) => {
                    if(err){
                        console.log(err);
                        res.redirect("/register");
                    } else {
                        passport.authenticate("local")(req, res, () => {
                            res.redirect("/secrets");
                        });
                    }
                }
            );
        } catch (error) {
            console.log(error);
        }
    }
});

// Using passport authentication to make sure only authenticated users with sessions can access the secrets page
/* The callback function for the secrets GET route uses isAuthenticated() that returns “true” in case an authenticated user
   is present in “req.session.passport */
app.get("/secrets", async(req, res) => {
    try {
        const data = await db.query("SELECT secrets.secret FROM users INNER JOIN secrets ON users.id = secrets.user_id");
        if(req.user){
            res.render("secrets.ejs", {user_email: req.user.email, username: req.user.username, secrets: data.rows});
        } else {
            res.render("secrets.ejs", {user_email: null, username: "Guest", secrets: data.rows});
        }
    } catch (error) {
        console.log(error);
    }
});

// Disaplying the submit page for authenticated users only
/* The callback function uses isAuthenticated() function that returns “true” in case an authenticated user
   is present in “req.session.passport */
app.get("/submit", (req, res) => {
    if(req.isAuthenticated()){
        res.render("submit.ejs", {user_id: req.user.id, user_email: req.user.email, username: req.user.username});
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", async(req, res) => {
    try {
        await db.query("INSERT INTO secrets (secret, user_id) VALUES ($1, $2)", [req.body.secret, req.user.id], (err, user) => {
            if(err){
                console.log(err);
                res.redirect("/submit");
            } else {
                res.redirect("/secrets");
            }
        });
    } catch (error) {
        console.log(error);
    }
});

/* Defining the logout GET route.
   Using Passport's logout() function, user's session is terminated and the user is redirected to the main page */
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) { return next(err); }
      res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
});