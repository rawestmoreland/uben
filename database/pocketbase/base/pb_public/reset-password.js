// Password reset page for Üben cloud backup accounts.
//
// The reset email links here as /reset-password.html#<token>. The token is in
// the URL fragment, which browsers never send to a server, so it can't end up
// in access logs. It is read once and removed from the address bar.
(function () {
  'use strict';

  var MIN_PASSWORD_LENGTH = 8;
  var form = document.getElementById('form');
  var intro = document.getElementById('intro');
  var message = document.getElementById('message');
  var submit = document.getElementById('submit');
  var passwordInput = document.getElementById('password');
  var confirmInput = document.getElementById('confirm');

  var token = '';
  try {
    token = decodeURIComponent(window.location.hash.slice(1));
  } catch (error) {
    token = '';
  }
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname);
  }

  function show(kind, text) {
    message.className = kind;
    message.textContent = text;
    message.hidden = false;
  }

  function showFinal(kind, text) {
    form.hidden = true;
    intro.hidden = true;
    show(kind, text);
  }

  if (!token) {
    showFinal(
      'error',
      'This link is incomplete. Request a new reset email from the app.',
    );
    return;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var password = passwordInput.value;

    if (password.length < MIN_PASSWORD_LENGTH) {
      show('error', 'Use a password with at least ' + MIN_PASSWORD_LENGTH + ' characters.');
      return;
    }
    if (password !== confirmInput.value) {
      show('error', 'The two passwords do not match.');
      return;
    }

    submit.disabled = true;
    message.hidden = true;

    fetch('/api/collections/users/confirm-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        password: password,
        passwordConfirm: password,
      }),
    })
      .then(function (response) {
        if (response.ok || response.status === 204) {
          showFinal(
            'success',
            'Password changed. Open Üben and sign in with your new password.',
          );
          return;
        }
        if (response.status === 429) {
          show('error', 'Too many attempts. Wait a few minutes and try again.');
          return;
        }
        return response.json().then(function (body) {
          var fields = (body && body.data) || {};
          if (fields.token) {
            showFinal(
              'error',
              'This link is invalid or has expired. Request a new reset email from the app.',
            );
          } else if (fields.password && fields.password.message) {
            show('error', fields.password.message);
          } else {
            show('error', 'Something went wrong. Try again.');
          }
        });
      })
      .catch(function () {
        show('error', 'No connection. Try again when you are online.');
      })
      .then(function () {
        submit.disabled = false;
      });
  });
})();
