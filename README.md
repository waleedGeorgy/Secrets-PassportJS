# Secrets 
A basic website that is loosely based off the Whisper app, where users can anonemously post their secrets.<br />
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
