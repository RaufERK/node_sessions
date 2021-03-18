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

// const db = [{ id: 1231, username: 'rauf', password: '123' }];

app.use((req, res, next) => {
  console.log('  req.session ==>', req.session);
  //записываем всегда информацию о пользователе во все хэбээски разом
  res.locals.username = req.session.username;
  next();
});

app
  .route('/login')
  .get((req, res) => {
    console.log('GET /LOGIN  ===========>>>>');
    res.render('login');
  })
  .post(async (req, res) => {
    console.log('POST /LOGIN  ===========>>>>');
    console.log('BODY >>>>', req.body);
    const { username, password } = req.body;

    const searchResult = await User.findOne({
      username,
      password: sha256(password),
    });

    console.log(' serachResult =>>>>>', searchResult);
    if (searchResult) {
      req.session.username = username;
      return res.render('index', { username });
    }
    res.redirect('/login');
  });

function protect(req, res, next) {
  if (!req.session.username) res.redirect('/login');
  next();
}

app.get('/profile', protect, (req, res) => {
  res.render('profile');
});

app.get('/', protect, (req, res) => {
  // console.log('HOME  ===========>>>>');
  // console.log('   req.session.views  ==>', req.session.views);

  if (req.session.views) {
    req.session.views++;
  } else {
    req.session.views = 1;
  }

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
        const newUser = await User.create({
          username,
          password: sha256(password),
        });
        console.log('   newUser  ===>>', newUser);
        req.session.username = req.body.username;
        res.redirect('/');
      } catch (err) {
        console.log('-----ERRORR------');
        console.log(err);
        res.redirect('/registration');
      }
    });

  res.locals.counter = req.session.views;
  res.render('index', { data: 'data' });
});
app.listen(PORT || 3000, () => {
  console.log('APP STARTED!!!');
});

// s%3AMNXR8gPLI9v-31oLZ2uWnoIJot7SxgKX.raB2u8VNfraCYl0x5nlu1d4rDg4fBzDU8wEKonah0Tc
