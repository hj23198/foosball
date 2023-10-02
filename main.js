var express = require('express');
var fs = require('fs');
var path = require('path')
var crypto = require("crypto-js");
var cookieParser = require('cookie-parser');

var app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(require('sanitize').middleware);

var PORT = 3000;

//TODO don't do this
var database = {
    "users": {},
    "active_tokens": {},
    "ip_list": {},
    "past_games": {},
    "game_id":0
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'));
})

app.get("/stylesheet", (req, res) => {
    res.sendFile(path.join(__dirname, "stylesheet.css"))
})

app.get('/register', (req, res) => {
    if ("token" in req.cookies) {
        if (req.cookies["token"] in database["active_tokens"]) {
            res.sendFile(path.join(__dirname, '/index.html'));
            return
        }
    }
    res.sendFile(path.join(__dirname, '/register.html'))
})

app.post('/register', (req, res) => {
    var ip = req.ip;

    if (ip in database["ip_list"]) {
        res.send("You appear to have already registered") //TODO update
        return
    }
    
    var usern = req.body.user

    if (usern == "" || req.body.passw == "") {
        res.send("Please select a username and password") //TODO
    }

    if (usern in database["users"]) {
        res.send("User already exists") //TODO
        return
    }
    var new_user = {
        "password":crypto.MD5(req.body.passw).toString(),
        "ip": ip,
        "elo": 1500,
        "pending_games": {},
    }
    var token = crypto.MD5(Math.random().toString(36))
    database["active_tokens"][token] = usern
    res.cookie('token', token.toString())
    res.cookie('usern', usern)
    database["users"][usern] = new_user
    res.sendFile(path.join(__dirname, '/index.html'));
    console.log("[User Registration] " + req.body.user)
    database["ip_list"][ip] = true
})

app.get('/login', (req, res) => {
    if ("token" in req.cookies) {
        if (req.cookies["token"] in database["active_tokens"]) {
            res.sendFile(path.join(__dirname, '/index.html'));
            return
        }
    }
    res.sendFile(path.join(__dirname, '/login.html'))
})

app.post('/login', (req, res) => {
    //TODO add login cd 
    //TODO add ip to account if logging on multiple devices
    var usern = req.body.user
    if (usern in database["users"]) {
        var pass = crypto.MD5(req.body.pass).toString()
        if (pass = database["users"][usern]["password"]) {
            var token = crypto.MD5(Math.random().toString(36))
            database["active_tokens"][token] = usern
            res.cookie('token', token.toString())
            console.log("[Login Success] " + usern)
            res.sendFile(path.join(__dirname, '/index.html'));
        } else {
            res.send("Login Failed") //TODO
            console.log("[Login Fail] " + usern)
        }
    } else {
        res.send("Login Failed") //TODO
        console.log("[Login Fail] " + usern)
    }
})

app.post('/signout', (req, res) => {
    if (req.cookies.token in database["active_tokens"]) {
        if (database["active_tokens"][req.cookies.token.toString()] == req.cookies.usern) {
            delete database['active_tokens'][req.cookies.token.toString()];
            res.clearCookie("token")
            res.clearCookie("name")
            res.clearCookie("usern")

            res.sendFile(path.join(__dirname, '/index.html')); //TODO
            console.log("[Logout Success] " + req.cookies.usern)
        } else {
            res.send("Logout unsuccessful. Thats impressive.") //TODO
            console.log("[Logout Fail] " + req.cookies.usern)
        }
    } else {
        res.send("Logout unsuccessful. Thats impressive") //TODO
        console.log("[Logout Fail] " + req.cookies.usern)
    }
})

app.get('/profileinfo', (req, res) => {
    if ("token" in req.cookies) {
        if (req.cookies.token in database["active_tokens"]) {
            var usern = database["active_tokens"][req.cookies.token]
            var elo = database["users"][usern]["elo"]
            var pending = database["users"][usern]["pending_games"]
            res.json([usern, elo, pending])
        } else {
            res.json("")
        }

    } else {
        res.json("")
    }
})

app.post('/loggame', (req, res) => {
    //TODO prevent logging games against self
    var usern = database["active_tokens"][req.cookies.token];
    var userelo = database["users"][usern]["elo"]
    var opponent = req.body.opponent;

    if (!(opponent in database["users"])) {
        res.send("Opponent does not appear to exist") //TODO
    } else {
        var winner;
        if (req.body.winner == "true") {
            winner == usern
        } else {
            winner = opponent
        }

        if (Object.keys(database["users"][opponent]["pending_games"]).length == 1) {
            res.send("Opponent already has a pending game")
            return
        }

        opponelo = database["users"][opponent]["elo"]
        database["users"][opponent]["pending_games"] = {
            "player1":usern,
            "player1elo":userelo,
            "player2":opponent,
            "player2elo":opponelo,
            "winner":winner,
            "game_id": database["game_id"]
        }
        database["game_id"] += 1
        res.send("Sent game confirmation request!")
        console.log("[Game Submission] p1: " + usern + ", p2: " + opponent + ", p1elo: ", userelo + ", p2elo:", + opponelo + ", winner: " + winner)
    }

})

app.post('/confirmgame', (req, res) => {
    console.log("Confirm request rec")
})

app.post('/denygame', (req, res) => {
    if (!(req.cookies.token in database["active_tokens"])) {
        res.sendFile(path.join(__dirname, '/index.html'))
        return
    }

    var user = database["active_tokens"][req.cookies.token]
    console.log("[Game Request] " + user + " denied " + database["users"][user]["pending_games"]["player1"] + "'s game request")
    database["users"][user]["pending_games"] = {}
    res.sendFile(path.join(__dirname, '/index.html'))
    return
})

app.get('/leaderboard', (req, res) => {

})


app.listen(PORT);
console.log('Server running on http://127.0.0.1:' + PORT);
