const express = require('express');
const app = express();
const cors = require('cors');
const session = require('express-session');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
// const mongoUrl = 'mongodb://localhost:27017/eagles2021';
const dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
require('dotenv').config();

console.log('------------------');
const { PWD, mongoUrl, PORT, secret } = process.env;
console.log(PWD);
console.log(PORT);
console.log(secret);

// const PORT = 3000;

mongoose.connect(mongoUrl, dbOptions, () => {
  console.log('DB COnnected!!!');
});

const User = mongoose.model('User', { username: String, password: String });
const Item = mongoose.model('Item', { name: String });

app.set('view engine', 'hbs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  // console.log('  req.session ==>', req.session);

  res.locals.username = req.session.username;
  next();
});

// const allowCORS = (req, res, next) => {
//   const origin = req.header('origin');
//   console.log('  origin ===>', origin);
//   if (origin === 'http://127.0.0.1:55001') {
//     res.header('Access-Control-Allow-Origin', '*');
//   }
//   next();
// };

app.use(cors());

app
  .route('/login')
  .get((req, res) => {
    //отрисовываем страница авторизации
    console.log('GET /LOGIN  ===========>>>>');
    res.render('login');
  })
  .post(async (req, res) => {
    //принимаем данные фрмы авторизации
    console.log('POST /LOGIN  ===========>>>>');
    console.log('BODY >>>>', req.body);
    const { username, password } = req.body;
    //ищем в базе именно пользователя у которого и логин и пароль одновременно такие какие ввёл пользователь

    try {
      const userFromBase = await User.findOne({ username });
      const formPasswordHash = await bcrypt.hash(password, saltRounds);
      console.log(' userFromBase =>>>>>', userFromBase);
      console.log(' userFromBase.password =>>>>>', userFromBase.password);
      const compareRes = await bcrypt.compare(
        userFromBase.password,
        formPasswordHash
      );
      console.log(' compareRes =>>>>>', compareRes);

      if (compareRes) {
        //если пользователь есть то записываем его имя в сессию
        req.session.username = username;
        return res.render('index', { username });
      }
    } catch (err) {
      console.log('========================');
      console.log(err);
    }
    res.redirect('/login');
  });

// мидлвара для защиты роутов от неавторизованных пользователей
function protect(req, res, next) {
  if (!req.session.username) return res.redirect('/login');
  next();
}

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
    res.render('registration');
  })
  .post(async (req, res) => {
    console.log('   registration  ==>>', req.body);
    const { username, password } = req.body;
    try {
      //создаём пользователя
      const newUser = await User.create({
        username,
        password: await bcrypt.hash(password, saltRounds),
      });

      console.log('   newUser  ===>>', newUser);

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
    console.log('   POST ==> /   body =>', req.body);
    await Item.create(req.body);
    res.redirect('/');
  });

app.get('/api', async (req, res) => {
  const items = await Item.find();
  res.send({ items });
});

app.get('/api1', async (req, res) => {
  const items = await Item.find();
  res.send({ items });
});

app.get('/api100', async (req, res) => {
  const items = await Item.find();
  res.send({ items });
});

app.listen(PORT || 3000, () => {
  console.log('APP STARTED!!!');
});
