

Pas de ssl pour postfix uniquement

Ajouter dans /etc/postfix/master.cf
<!-- smtp       inet  n       -       n       -       -       smtpd
submission inet  n       -       y       -       -       smtpd -o syslog_name=postfix/submission -o smtpd_tls_security_level=encrypt -o smtpd_sasl_auth_enable=yes -o smtpd_sasl_type=dovecot -o smtpd_sasl_path=private/auth -o smtpd_reject_unlisted_recipient=no -o smtpd_client_restrictions=permit_sasl_authenticated,reject -o milter_macro_daemon_name=ORIGINATING
smtps      inet  n       -       -       -       -       smtpd -o syslog_name=postfix/smtps -o smtpd_tls_wrappermode=yes -o smtpd_sasl_auth_enable=yes -o smtpd_sasl_type=dovecot -o smtpd_sasl_path=private/auth -o smtpd_client_restrictions=permit_sasl_authenticated,reject -o milter_macro_daemon_name=ORIGINATING -->

