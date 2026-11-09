const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    name: 'Sri Venugopala Swamy Temple',
    location: 'Bolarum, Secunderabad',
    address: 'S.C.B No. 8-8-120, Doveton Bazar, Bollarum, Secunderabad-10',
    phone: '9849051627',
    timings: {
      morning: '6:30 AM – 10:30 AM',
      evening: '6:30 PM – 8:30 PM',
    },
    donateUrl: 'https://rzp.io/l/e879bBWn',
    mapUrl:
      'https://www.google.com/maps/search/?api=1&query=Sri+Venugopala+Swamy+Temple+Bolarum',
    contacts: [
      { name: 'C.K. Arjun Rao', phone: '+919849051627' },
      { name: 'V.S. Varmesh', phone: '+919441051658' },
      { name: 'C.R. Sanjay Srivatsan', phone: '+919703765756' },
    ],
  });
});

module.exports = router;
