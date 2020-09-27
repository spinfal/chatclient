// custom code
function cuscode() {
	var value = document.getElementById("custom-id").value;
	if (document.getElementById("custom-id").value == "") {
	  alert("Code cannot be empty.")
	} else if (value.length <= 5) {
	  alert("Code needs to be 6 letters or longer.")
	} else {
	  document.title = "creating..."; window.open("https://chatclient.spinfal.repl.co/?chat=" +  document.getElementById("custom-id").value, "_self");
	}
}
// kinda ghetto but eh :shrug: