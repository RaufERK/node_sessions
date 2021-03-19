const express = require('express');
const app = express();
const PORT = 3000;
const session = require('express-session');
const sha256 = require('sha256');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const mongoUrl = 'mongodb://localhost:27017/eagles2021';
const dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

mongoose.connect(mongoUrl, dbOptions, () => {
  console.log('DB COnnected!!!');
});

const User = mongoose.model('User', { username: String, password: String });
items = ['text', 'text2', 'text3'];

app.set('view engine', 'hbs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'keyboard cat',
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
    const searchResult = await User.findOne({
      username,
      password: sha256(password),
    });

    console.log(' serachResult =>>>>>', searchResult);

    if (searchResult) {
      //если пользователь есть то записываем его имя в сессию
      req.session.username = username;
      return res.render('index', { username });
    }
    res.redirect('/login');
  });

// мидлвара для защиты роутов от неавторизованных пользователей
function protect(req, res, next) {
  if (!req.session.username) res.redirect('/login');
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
        password: sha256(password),
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
  .get((req, res) => {
    if (req.session.views) {
      req.session.views++;
    } else {
      req.session.views = 1;
    }
    res.locals.counter = req.session.views;
    res.render('index', { items });
  })
  .post((req, res) => {
    console.log(req.body);
    items.push(req.body.item);
    res.redirect('/');
  });

app.get('/api', (req, res) => {
  res.header('Access-Control-Allow-Origin','*')
  res.send({ items });
});

app.listen(PORT || 3000, () => {
  console.log('APP STARTED!!!');
});
