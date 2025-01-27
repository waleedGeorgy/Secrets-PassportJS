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
- A database which includes two tables, the first one named "users", contains (id, email, password). The second one named "secrets", contains (id, secret, user_id).
## The basic steps for creating a local authentication strategy
The process of creating a local authentication strategy can be broken down into 8 steps:
1. Importing express-session, passport and passport-local modules.
```js
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';
```
2. Setting up the express-session and using it as middleware for the ExpressJS application. The express-session function takes the form of `session({ options })` that are documented <a href='https://www.npmjs.com/package/express-session'>here</a>. This will create a session object and attach it to every request made by the application `req.session`.
```js
const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
```
3. Initializing an instance of the PassportJS and using it as middleware for the ExpressJS application, then attaching the express session to the passport. Which will attach the passport object to the end of `req.session` creating `req.session.passport`.
```js
app.use(passport.initialize());
app.use(passport.session());
```
4. Defining the local authentication strategy. The `LocalStrategy()` function takes a callback `(user, password, done) => {}` that will authenticate the user using their email and password (for example), that will return `done(null, false)` in case no user was found, `done(null, USER)` in case a user was found in the DB, or `done(error)` in case the there was en error in while quereing.
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
5. Serializing the user, i.e. attaching the authenticated user to a session, which will create the `req.session.passport.USER` object.
```js
passport.serializeUser((user, done) => {
    done(null, user.id);
});
```
6. Deserializing the user, i.e. retrieving authenticated user's information from the database in order to use in different parts of the code, creating the `req.user` object.
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
7. Using the defined strategy from step 4 to authenticate users with `passport.authenticate(strategyName, {options}, callback())`. For example redirecting logged in (authenticated) users to the main page of the website.
```js
app.post("/login", passport.authenticate('local', {
    successRedirect: "/secrets",
    failureRedirect: "/login",
}));
```
8. Protecting routes that should only be accessible by authenticated users using `isAuthenticated()`. For example, making sure that only authenticated users are able to access the post secret page.
```js
app.get("/submit", (req, res) => {
    if(req.isAuthenticated()){
        res.render("submit.ejs", {user_id: req.user.id, user_email: req.user.email, username: req.user.username});
    } else {
        res.redirect("/login");
    }
});
```
<i><b>NOTE:</b></i> this is not the only way of setting up passport authentication. Still, the core of the steps outlined above would not change that much from implementation to another, but rather the logic the defines them (depending on your use-case).
