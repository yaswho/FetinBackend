require("dotenv").config();
const express = require('express');
const router = express.Router();
const Chronos = require('./../Utils/Chronos');
const utils = require('./../Utils/utils');
const Paciente = require('../models/Paciente');
const bcrypt = require('bcrypt');

const pontos = 0;
const novopeso = 0;

//Função para registrar o paciente
router.post("/registrarPaciente", async(req, res)=> {
   
	const users = await Paciente.findAll({
		where: {
		  email: req.body.email
		 }
		}); 
		
	if(Object.keys(users).length > 0) {
		const query = utils.createURLFeedback("Cal - Feedback",
			"Erro ao cadastrar",
			`Erro ao cadastra`,
			"error-1",
			"error.png");

		res.redirect(query);
		return;
	}

	if(!Chronos.isFree(req.body.email))
	{
		const query = utils.createURLFeedback("Cal - Feedback",
			"Erro ao cadastrar",
			`O email de confirmação já foi enviado para este o endereço ${req.body.email}.`,
			"error-1",
			"error.png");

		res.redirect(query);
		return;
	}
	
	var uuid = Chronos.checkEmail(req.body.email, req.body);

	utils.sendEmail(
		req.body.email,
		`<div style="padding: 5px; background-color: rgb(231, 231, 231); margin: 0px;">

		<div style="padding-left: 20px;">
		<h1 style="text-align: center; background-color: rgb(0, 128, 96); padding-top: 10px; padding-bottom: 10px;">Cadastro na Calorie Counter</h1></br>
			<p>Você iniciou o cadastro na Calorie Counter, para terminar, <a href="http://localhost:${process.env.PORT}/site/registro/${utils.encrypt(uuid, 60*24)}">clique aqui</a>.</p>
			<p>Obrigada pela preferência!</p></br></br>
		</div>
			
		</div>`,
		"Confirme seu cadastro."
	)

	const query = utils.createURLFeedback("Cal - Feedback",
		"Sucesso!",
		"Siga para seu email para terminar o seu registro.",
		"success-1",
		"success.png");

	res.redirect(query);
	return;

});


//Função para inserir novos valores de altura e peso 
/*router.post("/pontos", async(req, res)=> {
		
	 const users = await Paciente.findAll({
		where: {
		  email: req.body.email
		 }
		}); 

	if(Object.keys(users).length < 0) {
			return res.status(400).json({
				erro: true,
				mensagem: "Erro: Email não encontrado!"
			})
		}

		res.redirect('../site/perfil');
	
	})       
	});*/


router.post('/registrar', async(req, res) => {
	var session = utils.decrypt(req.body.session);
	var data = Chronos.getEmailSession(session);
	var salt = bcrypt.genSaltSync(13);
	const psw = bcrypt.hashSync(req.body.password, salt);
	const _uuid = await utils.generatePacientUUID();

	const dt = { ...data, senha: psw, uuid: _uuid };

	await Paciente.create(dt) //aqui
		.then(()=> {

			const query = utils.createURLFeedback("Cal - Feedback",
				"Sucesso!",
				"Paciente cadastrado com sucesso.",
				"success-1",
				"success.png");

			res.redirect(query);
			return;

		}).catch((err) => {

			const query = utils.createURLFeedback("Cal - Feedback",
			"Erro ao cadastrar.",
			"Senha ao cadastrar.",
			"error-1",
			"error.png");

		res.redirect(query);
		return;
		});

	Chronos.freeEmail(session);
})

//Função de login 
router.post('/login', async(req, res) => {

	const users = await Paciente.findAll({
		attributes: ['email', 'uuid', 'senha'],
		where: {
			email: req.body.email
		}
	}); 

	if(Object.keys(users).length < 0) {
		const query = utils.createURLFeedback("Cal - Feedback",
			"Erro ao entrar.",
			"Senha incorreta.",
			"error-1",
			"error.png");

		res.redirect(query);
		return;
	}

	var pass = await bcrypt.compare(req.body.senha, users[0].dataValues.senha);

	if(!pass)
	{
		const query = utils.createURLFeedback("Cal - Feedback",
			"Erro ao entrar.",
			"Senha incorreta.",
			"error-1",
			"error.png");

		res.redirect(query);
		return;
	}

	const token = utils.encrypt(`${users[0].dataValues.email}&${users[0].dataValues.uuid}`, 24*60);
	utils.setCookie(res, "token", token, 24*60);

	res.redirect('../site/perfil');
});

//Função de logout 
router.post('/logout', async(req, res, next) => {
	utils.deleteCookie(res, 'token');
	//sucesso
});

//funnção para mostrar os dados do banco 
router.get('/teste', async(req, res) => {
	
	Paciente.findAll().then(function(infos){
		res.render('teste', {infos: infos});
	}) 
		
});

router.post('/atualizarDados', utils.verifyJWT, async(req, res, next) => {
	const users = await Paciente.findAll({
		attributes: ['peso', 'altura', 'nome_paciente', 'peso_anterior', 'altura_anterior'],
		where: {
		  uuid: utils.getUUIDFromToken(req.cookies.token)
		 }
		}); 

	var tipo = (Number.isInteger(req.body.update)) ? req.body.update : parseInt(req.body.update);

	if(tipo == 1)
	{
		await Paciente.update({ nome_paciente: req.body.update_name }, {
			where: {
				uuid: utils.getUUIDFromToken(req.cookies.token)
			}
		});

		const query = utils.createURLFeedback("Cal - Feedback",
			"Sucesso!",
			"Atualizado.",
			"success-1",
			"testecheck.jpeg");

		res.redirect(query);
		return;

	} else if(tipo == 2) {
		var alturas = users[0].dataValues.altura_anterior;

		alturas[alturas.length] = {
			altura: users[0].dataValues.altura,
			data: new Date().toLocaleDateString()
		}

		await Paciente.update({ altura: req.body.update_altura, altura_anterior: alturas }, {
			where: {
				uuid: utils.getUUIDFromToken(req.cookies.token)
			}
		});

		const query = utils.createURLFeedback("Cal - Feedback",
			"Sucesso!",
			"Atualizado.",
			"success-1",
			"sucesso.png");

		res.redirect(query);
		return;

	} else if(tipo == 3) {
		var pesos = users[0].dataValues.peso_anterior;

		pesos[pesos.length] = {
			peso: users[0].dataValues.peso,
			data: new Date().toLocaleDateString()
		}

		await Paciente.update({ peso: req.body.update_peso, peso_anterior: pesos }, {
			where: {
				uuid: utils.getUUIDFromToken(req.cookies.token)
			}
		});

		const query = utils.createURLFeedback("Cal - Feedback",
			"Sucesso!",
			"Atualizado.",
			"success-1",
			"sucesso.png");

		res.redirect(query);
		return;
	} else {
		const query = utils.createURLFeedback("Cal - Feedback",
			"Erro ao atualizar.",
			"Não foi encontrado tipo de dado..",
			"error-1",
			"error.png");

		res.redirect(query);
		return;
	}
});

//Exportando router
module.exports= router;