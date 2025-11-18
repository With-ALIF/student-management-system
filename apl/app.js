fetch("../src/present.html")
        .then(response => {
          if (!response.ok) throw new Error("Network response was not ok: " + response.status);
          return response.text();
        })
        .then(data => {
          document.getElementById("attendance").innerHTML = data;
        })
        .catch(err => {
          console.error("Fetch failed:", err);
          document.getElementById("attendance").innerHTML =
            "<p style='color:red'>Failed to load attendance template. Check console for details.</p>";
        }); 