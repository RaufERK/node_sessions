require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const { Item, User, dbOptions } = require('./db/mongo');
const { mongoUrl, PORT, secret, salt } = process.env;
const saltRounds = Number(salt);
console.log('  saltRounds ===>', saltRounds);

mongoose.connect(mongoUrl, dbOptions, () => {
  console.log('DB COnnected!!!');
});

app.set('view engine', 'hbs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// мидлвара для сессий
app.use(
  session({
    secret,
    resave: true,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 60000 },
    store: MongoStore.create({ mongoUrl }),
  })
);

// эта мидлвара записываем всегда информацию о пользователе во все хэбээски разом
app.use((req, res, next) => {
  res.locals.username = req.session.username;
  next();
});

// мидлвара для защиты роутов от неавторизованных пользователей
function protect(req, res, next) {
  if (!req.session.username) return res.redirect('/login');
  next();
}

app.use(cors());
// наша кастомная корс миддвара
// const allowCORS = (req, res, next) => {
//   const origin = req.header('origin');
//   console.log('  origin ===>', origin);
//   if (origin === 'http://127.0.0.1:55001') {
//     res.header('Access-Control-Allow-Origin', '*');
//   }
//   next();
// };

app
  .route('/login')
  .get((req, res) => {
    //отрисовываем страница авторизации
    res.render('login');
  })
  .post(async (req, res) => {
    //принимаем данные фрмы авторизации
    const { username, password } = req.body;
    try {
      //ищем в базе именно пользователя у которого и логин и пароль одновременно такие какие ввёл пользователь
      const userFromBase = await User.findOne({ username });
      if (!userFromBase) return res.redirect('/login');
      //проверяем совпадение пароей
      const compareRes = await bcrypt.compare(password, userFromBase.password);

      if (compareRes) {
        //если пользователь есть то записываем его имя в сессию
        req.session.username = username;
        return res.redirect('/');
      }
    } catch (err) {
      console.log('===========ERROR=============');
      console.log(err);
    }
    res.redirect('/login');
  });

//секретный роут который надо защитить
app.get('/profile', protect, (req, res) => {
  res.render('profile');
});

app.get('/logout', (req, res) => {
  //session destroy
  req.session.destroy();
  res.redirect('/login');
});

app
  .route('/registration')
  .get((req, res) => {
    //отрисовка страицы с регистрацией
    res.render('registration');
  })
  .post(async (req, res) => {
    const { username, password } = req.body;
    try {
      //шифруем пароль
      const passwordHash = await bcrypt.hash(password, saltRounds);
      //создаём пользователя
      const newUser = await User.create({
        username,
        password: passwordHash,
      });

      //сразу записываем пользователя в сессию
      req.session.username = req.body.username;
      res.redirect('/');
    } catch (err) {
      console.log('-----ERRORR------');
      console.log(err);
      res.redirect('/registration');
    }
  });

app
  .route('/')
  .get(async (req, res) => {
    if (req.session.views) {
      req.session.views++;
    } else {
      req.session.views = 1;
    }
    res.locals.counter = req.session.views;
    const items = await Item.find();
    res.render('index', { items });
  })
  .post(async (req, res) => {
    await Item.create(req.body);
    res.redirect('/');
  });

//апи для свободно   раздачи даных
app.get('/api', async (req, res) => {
  const items = await Item.find();
  res.send({ items });
});

app.listen(PORT || 3000, () => {
  console.log('APP STARTED!!!');
});
