const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const convertBtn = document.getElementById("convertBtn");

let images = [];

imageInput.addEventListener("change", () => {

    images = [];
    preview.innerHTML = "";

    const files = [...imageInput.files];

    files.forEach(file => {

        if(!file.type.startsWith("image/")){
            return;
        }

        const reader = new FileReader();

        reader.onload = function(e){

            images.push(e.target.result);

            const img = document.createElement("img");
            img.src = e.target.result;

            preview.appendChild(img);

        };

        reader.readAsDataURL(file);

    });

});

convertBtn.addEventListener("click", async ()=>{

    if(images.length===0){
        alert("Pilih minimal satu gambar.");
        return;
    }

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
        orientation:"portrait",
        unit:"mm",
        format:"a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for(let i=0;i<images.length;i++){

        const img = new Image();

        await new Promise(resolve=>{

            img.onload = ()=>{

                let width = pageWidth - 20;

                let height =
                    img.height * width / img.width;

                if(height > pageHeight - 20){

                    height = pageHeight - 20;

                    width =
                        img.width * height / img.height;

                }

                if(i>0){
                    pdf.addPage();
                }

                pdf.addImage(
                    images[i],
                    "JPEG",
                    (pageWidth-width)/2,
                    (pageHeight-height)/2,
                    width,
                    height
                );

                resolve();

            };

            img.src = images[i];

        });

    }

    pdf.save("PhotoToPDF.pdf");

});