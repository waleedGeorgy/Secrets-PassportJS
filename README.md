# Secrets 
A basic website that is loosely based on the Whisper app, where users can anonymously post their secrets.<br />
The main point of this project is to test out, experiment with and document the <b>PassportJS</b> package, that is not very well documented, and does not have much resources or tutorials online, especially when used with PostgreSQL.<br />
## Project Structure
The project uses:
- the <b>ECMAScript (ES6) module system</b>.
- <b>async/await</b> for the promise-based parts of code.
- <b>NodeJS</b> and <b>ExpressJS</b> for setting up the server and route handling.
- <b>PostgreSQL</b> as the DBMS.
- <b>express-session</b> for setting up ExpressJS sessions.
- <b>PassportJS</b> for managing user sessions and enabling the different authentication strategies.
- <b>passport-local</b> & <b>passport-google-oauth20</b> for creating local and google OAuth2.0 authentication strategies respectively.
- PostgreSQL's built-in <b>pgcrypto</b> module for hashing and salting user passwords.
- A database which includes two tables, the first one named "users", contains (id, email, password). The second one named "secrets", contains (id, secret, user_id).
## Basic steps for creating a local authentication strategy
The process of creating a local authentication strategy can be broken down into 8 main, and 1 optional, steps:
1. Import express-session, passport and passport-local modules.
```js
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';
```
2. Set up the express-session and use it as middleware for the ExpressJS application. The express-session function takes the form of `session({ options })` which is documented <a href='https://www.npmjs.com/package/express-session'>here</a>. This will create a session object and attach it to every request made by the application `req.session`.
```js
const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
```
3. Initialize an instance of the PassportJS and use it as middleware for the ExpressJS application, then attach the express session to the passport. This will attach the passport object to the end of `req.session` creating `req.session.passport`.
```js
app.use(passport.initialize());
app.use(passport.session());
```
4. Define the local authentication strategy. The `LocalStrategy()` function (middleware) takes in a callback `(user, password, done) => {}` that authenticates users using their email and password (for example), and returns a "verify" function, that takes one of three forms: `done(null, false)` in case no user was found, `done(null, USER)` in case a user was found in the DB, or `done(error)` in case an error occured while querying. The `done()` callback is detailed <a href='https://www.passportjs.org/concepts/authentication/strategies/#verify-function'>here</a>.
```js
passport.use(new LocalStrategy(async(user, password, done) => {
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
5. Serialize the user, i.e. attaching the authenticated user to a session, which will create the `req.session.passport.USER` object (in this example we're only attaching user's id to the session). The `serializeUser(callback{userObject, done()})` function accepts 2 parameters, a user object that contains the user retrieved using the strategy from step 4, and a verify function that attaches the user to the session when the strategy executes correctly. 
```js
passport.serializeUser((user, done) => {
    done(null, user.id);
});
```
6. Deserialize the user, i.e. retrieving the authenticated user's information from the database to use it in different parts of code, creating the `req.user` object. The `deserializeUser(callback{userObject, done()})` is the same as above, except for the verify function which adds the user to "req".
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
7. Use the defined strategy from step 4 to authenticate users with `passport.authenticate(strategyName, {options}, callback())`. For example redirecting logged in (authenticated) users to the main page of the website. For local authentication the `strategyName` always equals 'local'. In `{ options }` you can specify redirection and logging, and the two main options are `successRedirect` and `failureRedirect` which are self-explanatory.
```js
app.post("/login", passport.authenticate('local', {
    successRedirect: "/secrets",
    failureRedirect: "/login",
}));
```
8. Protect routes that should be accessible only by authenticated users using the `.isAuthenticated()` function. For example, in the snippet below, I am making sure that only authenticated users are able to access the submit secret page.
```js
app.get("/submit", (req, res) => {
    if(req.isAuthenticated()){
        res.render("submit.ejs", {user_id: req.user.id, user_email: req.user.email, username: req.user.username});
    } else {
        res.redirect("/login");
    }
});
```
9. (Optional) Use the `.logout()` function to end user sessions. The logout function takes the form of `.logout(callback(err))`. It is worth to note that this function WILL NOT work without defining a callback.
```js
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) { return next(err); }
      res.redirect('/');
    });
});
```
<i><b>NOTE:</b></i> this is not the only way of setting up passport authentication. Still, the core ideas outlined in the steps above would not change that much from one implementation to another, even the logic that defines said steps would most likely stay the same (depending on your use-case).

## Basic steps for creating a Google OAuth2.0 authentication strategy
For this to work, you first need to create an <b>OAuth 2.0 Client ID</b> by filling out the <b>OAuth consent</b> screen in <b>Google APIs</b>.<br>
> For this strategy I updated the "users" table by adding 2 new columns: `google_id` which will contain the google ID of the authenticated user, as well as `username` which will contain user's google username.

Setting up this strategy is similar to setting up the local strategy outlined in the section above.
1. Import express-session, passport and passport-google-oauth20 modules.
```js
import session from 'express-session';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
```
2. Set up the express-session and use it as middleware for the ExpressJS application. The express-session function takes the form of `session({ options })` which is documented <a href='https://www.npmjs.com/package/express-session'>here</a>. This will create a session object and attach it to every request made by the application `req.session`.
```js
const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
```
3. Initialize an instance of the PassportJS and use it as middleware for the ExpressJS application, then attach the express session to the passport. This will attach the passport object to the end of `req.session` creating `req.session.passport`.
```js
app.use(passport.initialize());
app.use(passport.session());
```
4. Define the Google authentication strategy. The `GoogleStrategy()` function (middleware) accepts a callback `({ options }, callback(accessToken, refreshToken, profile, done))`. `{ options }` is where you set up your client ID credentials, `clientID` and `cliendSecret` are provided by Google, while `callbackURL` is defined by you when creating the client ID. In the callback you define the "find or create user" logic. Just like with the local strategy we use the `done()` "verify" function to either return the found or created user, and ready it for serialization, or output an error otherwise.
```js
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    const userData = profile._json;
    let user = {};
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
```
5. Serialize the user, i.e. attaching the authenticated user to a session, which will create the `req.session.passport.USER` object (in this example we're only attaching user's id to the session). `serializeUser(callback{userObject, done()})` take in 2 parameters, a user object that contains the user that was retrieved using the strategy from step 4, and the verify function that attaches the user to the session when the strategy executes correctly. 
```js
passport.serializeUser((user, done) => {
    done(null, user.id);
});
```
6. Deserialize the user, i.e. retrieving authenticated user's information from the database to use it in different parts of code, creating the `req.user` object. The `deserializeUser(callback{userObject, done()})` is the same as above, except for the verify function which adds the user to "req".
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
7. Set-up the Google authentication route with `passport.authenticate('google', { scopes })`, which will take the user to the "Sign up with Google" form. In case of successful authentication, Google returns whatever is defined in `{ scopes }`. For example. in the code below I am declaring that I want user's profile which contains info such as user's name, google id, profile picture, etc. which will be used to either find or create a new user, as was defined in the strategy above.
```js
app.get("/auth/google",
    passport.authenticate('google', { scope: ["profile"] })
);
```
8. Redirect users on successful authentication to the main page of the website. This path is set up while creating the OAuth client's ID.
```js
app.get("/auth/google/secrets",
    passport.authenticate('google', { successRedirect: "/secrets", failureRedirect: "/login" })
);
```
Now that you have an authenticated user with an active session you can use functions such as `.isAuthenticated()` and `.logout()`, among others, to control the flow of your website.
