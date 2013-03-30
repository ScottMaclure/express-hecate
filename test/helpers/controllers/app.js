/*global module */

/**
 * Home page.
 */
module.exports.index = function(req, res){
    res.render('index', {
        title: 'Express Router'
    });
};

/**
 * FAQs.
 */
module.exports.faqs = function(req, res){
    res.render('faqs', {
        title: 'FAQs'
    });
};
