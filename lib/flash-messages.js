/*!
 * Express - Contrib - messages
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 * @yonggao - enhance to support bootstrap messaging
 */

module.exports = function(req, res) {
  return function() {
    var buf = [], messages = req.flash(), types = Object.keys(messages), len = types.length;
    if(!len)
      return '';
    buf.push('<div class="alert-message">');
    buf.push('  <a class="close" href="#">x</a>');
    for(var i = 0; i < len; ++i) {
      var type = types[i], msgs = messages[type];
      if(msgs) {
        buf.push('  <ul class="' + type + '">');
        for(var j = 0, l = msgs.length; j < l; ++j) {
          var msg = msgs[j];
          buf.push('    <li><span class="label ' + type + '">' + type +'</span> ' + msg + '</li>');
        }
        buf.push('  </ul>');
      }
    }
    buf.push('</div>');
    return buf.join('\n');
  };
};
