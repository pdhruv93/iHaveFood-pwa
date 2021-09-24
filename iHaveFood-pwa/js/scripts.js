$(document).ready(function(){

  //Materialize components initializations
  $('.parallax').parallax();
  $('.modal').modal();
  $('.datepicker').datepicker({
    format: 'dd.mm.yyyy',
    minDate: new Date()
  });


  //search FAB initializations
  $('.search').floatingActionButton({
    direction: 'left',
    hoverEnabled: true
  });


  //Enabling Firestore Persistence
  db.enablePersistence()
  .catch(function(err) {
    if (err.code == 'failed-precondition')
    {
      // probably multible tabs open at once
      console.log('persistance failed');
    }
    else if (err.code == 'unimplemented')
    {
      // lack of browser support for the feature
      console.log('persistance not available');
    }
  });


  //listening to search by pincode text input
  $("#searchInput").on("input", function() {
    var searchPincode=$(this).val();

    if(searchPincode=="")
      $("#entries .entry").show();
    else if(searchPincode.length > 3)
    {
      db.collection("entries")
      .get()
      .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            if(doc.data().pincode==searchPincode)
              $(`#entry-${doc.id}`).show();
            else
              $(`#entry-${doc.id}`).hide();
          });
      })
      .catch((error) => {
          console.log("Error getting documents: ", error);
      });
    }
  });


  //Form Submit Handler
  $( "#entryForm" ).submit(function( event ) {
    console.log("Form Submitted. Sending Data to Firestore DB..");
    db.collection('entries').add(
      {
        title: $("form #title").val(),
        fullName: $("form #fullName").val(), 
        email: $("form #email").val(), 
        phone: $("form #phone").val(), 
        locality: $("form #locality").val(),
        pincode: $("form #pincode").val(),
        expiry : $("form #expiry").val(),
        description: $("form #description").val(),
        imageURL: $("form #imageURL").val(),
        deviceId: "",
      }
    )
    .then(()=> {
      M.toast({html: 'Entry created Successfully. You can close the window'});
      $('#entryForm').trigger("reset");
		})
    .catch(err =>{
      event.preventDefault();
      M.toast({html: 'Some error creating Entry'})
      console.log(err);
    });
  });


  // real-time listener to Show or Remove entries on UI
  db.collection('entries').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if(change.type === 'added'){
        renderEntry(change.doc.data(), change.doc.id);
      }
      if(change.type === 'removed'){
        removeEntry(change.doc.id);
      }
    });
  });


});



// render entry data
const renderEntry = (data, id) => {

  if(moment(data.expiry, "DD.MM.YYYY").isAfter(moment()))
  {
    const entries = document.querySelector('#entries');
    const html = `
      <div class="entry" id="entry-${id}">
        <div class="card">
          <div class="card-image">
            <img src="${data.imageURL}" onerror=this.src="./img/default.jpg">
            <span class="card-title">${data.title}</span>
          </div>
          <div class="card-content">
            <p>
              <b>From:</b> ${data.fullName}
              <b>Location:</b> ${data.locality}, ${data.pincode}
              <b>Expiry:</b> ${data.expiry}
              <br>
              <b>Description:</b> ${data.description}
            </p>
          </div>
          <div class="card-action">
            <a href="mailto:${data.email}">Email</a>
            ${data.phone!="" ? `<a href="tel:${data.phone}">Call</a>` : `` }
          </div>
        </div>
      </div>
    `;
    entries.innerHTML += html;
  }
};


// remove entry
const removeEntry = (id) => {
  document.querySelector(`#entry-${id}`).remove();
};