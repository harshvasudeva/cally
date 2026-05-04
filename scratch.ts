fetch("https://files-f1.motorsportcalendars.com/f1-calendar_p1_p2_p3_q_s_gp.ics", {
  headers: { "User-Agent": "Cally/1.0 Calendar App" }
}).then(res => console.log(res.status, res.statusText)).catch(console.error);
