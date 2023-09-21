require('dotenv').config()

const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken');
const fs = require('fs')
const axios = require('axios')
const querystring = require('querystring')

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))

const getClientSecret = () => {
	const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_FILE_PATH);
	const headers = {
        "alg": "ES256",
		"kid": process.env.KEY_ID
	}
    
    const dataAtual = new Date();
    const date2Month = new Date()
    date2Month.setMonth(date2Month.getMonth() + 2);

	const claims = {
		"iss": process.env.TEAM_ID,
        "iat": Math.floor(dataAtual.getTime() / 1000),
        "exp": Math.floor(date2Month.getTime() / 1000),
        "aud": "https://appleid.apple.com",
        "sub": process.env.CLIENT_ID
	}
    console.log(headers, claims)
	token = jwt.sign(claims, privateKey, {
		algorithm: 'ES256',
		header: headers
	});

	return token
}

const getUserId = (token) => {
	const parts = token.split('.')
	try {
		return JSON.parse(new Buffer(parts[1], 'base64').toString('ascii'))
	} catch (e) {
		return null
	}
}

app.post('/auth', bodyParser.urlencoded({ extended: false }), (req, res) => {
	const clientSecret = getClientSecret()
	console.log('@@code', req.body.code)
	const requestBody = {
		grant_type: 'authorization_code',
		code: req.body.code,
		redirect_uri: process.env.REDIRECT_URI,
		client_id: process.env.CLIENT_ID,
		client_secret: clientSecret,
		scope: process.env.SCOPE
	}

	axios.request({
		method: "POST",
		url: "https://appleid.apple.com/auth/token",
		data: querystring.stringify(requestBody),
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
	}).then(response => {
        console.log('@@response', response.data)
		return res.json({
			success: true,
			data: response.data,
			user: getUserId(response.data.id_token)
		})
	}).catch(error => {
		return res.status(500).json({
			success: false,
			error: error.response.data
		})
	})
})

app.post('/refresh-token', bodyParser.urlencoded({ extended: false }), (req, res) => {
	const clientSecret = getClientSecret()
	const requestBody = {
		client_id: process.env.CLIENT_ID,
		client_secret: clientSecret,
		grant_type: 'refresh_token',
		refresh_token: 'REFRESH_TOKEN'
	}

	axios.request({
		method: "POST",
		url: "https://appleid.apple.com/auth/token",
		data: querystring.stringify(requestBody),
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
	}).then(response => {
        console.log('@@response', response.data)
		return res.json({
			success: true,
			data: response.data,
			user: getUserId(response.data.id_token)
		})
	}).catch(error => {
		return res.status(500).json({
			success: false,
			error: error.response.data
		})
	})
})

app.listen(process.env.PORT || 3000, () => console.log(`App listening on port ${process.env.PORT || 3000}!`))
