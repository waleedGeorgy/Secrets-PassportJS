# Secrets 
A basic website that is loosely based on the Whisper app, where users can anonymously post their secrets.<br />
The main point of this project is to test out, experiment with and document the <b>PassportJS</b> package, that is not very well documented, and does not have much resources or tutorials online, especially when used with PostgreSQL.<br />
## Project Structure
The project uses:
- the <b>ECMAScript (ES6) Module System</b>.
- <b>async/await</b> for the promise-based parts of code.
- <b>NodeJS</b> and <b>ExpressJS</b> for setting up the server and route handling.
- <b>PostgreSQL</b> as the DBMS.
- <b>express-session</b> for setting up express sessions.
- <b>PassportJS</b> for managing user sessions and enabling the different authentication strategies.
- <b>passport-local</b> & <b>passport-google-oauth20</b> for creating local and google OAuth2.0 authentication strategies respectively.
- PostgreSQL's built-in <b>pgcrypto</b> for hashing and salting user passwords.
- A database which includes two tables, the first one named "users" that contains each (id, email, password). The second one named "secrets" which contains (id, secret, user_id).
## The basic steps for creating a local authentication strategy
The process of creating a local authentication strategy can be broken down into 8 steps:
1. Importing express-session, passport and passport-local modules.
```js
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';
```
2. Setting up the express-session and using it as middleware for your express application.
```js
const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
```
3. Initializing an instance of the PassportJS and using it as middleware for the ExpressJS application, then attaching the express session to the passport.
```js
app.use(passport.initialize());
app.use(passport.session());
```
4. Defining the local authentication strategy.
```js
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
```
5. Serializing the user.
```js
passport.serializeUser((user, done) => {
    done(null, user.id);
});
```
6. Deserializing the user.
```js
passport.deserializeUser(async(id, done) => {
    const result = await db.query("SELECT * FROM users WHERE id=$1", [id]);
    if (result.rowCount != 0){
        done(null, result.rows[0]);
    } else {
        done(null, false);
    }
});
```
7. Using the defined strategy to authenticate users using `passport.authenticate(strategyName, {options}, callback())`. For example redirecting logged in (authenticated) users to the main page of the website.
```js
app.post("/login", passport.authenticate('local', {
    successRedirect: "/secrets",
    failureRedirect: "/login",
}));
```
8. Protecting routes that should only be accessible by authenticated users using `isAuthenticated()`. For example, making sure only authenticated users are able to post secrets.
```js
app.get("/submit", (req, res) => {
    if(req.isAuthenticated()){
        res.render("submit.ejs", {user_id: req.user.id, user_email: req.user.email, username: req.user.username});
    } else {
        res.redirect("/login");
    }
});
```
<i>NOTE:</i> this is not the one and only way of setting up passport authentication. But, the main steps would not change, only the logic the defines them (depending on your use-case).
