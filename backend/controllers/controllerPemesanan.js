const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const fs = require("fs");

const {
    Akun,
    Barang,
    BarangYangDipesan,
    BuktiPembayaranPemesanan,
    Keranjang,
    Pemesanan
} = require('../database/models');

// array untuk data barang yang dipesan
let dataBYD = [];
// setTimeout
let waktuPembayaran;

const checkout = async (req, res) => {
    const logged = req.cookies.logged_account;
    const decoded = jwt.verify(logged, 'jwtAkunId');

    const {
        alamatTujuan,
        jasaPengiriman,
        biayaPengiriman,
        } = req.body;

    // transaction and export

    try {
        const userCart = await Akun.findOne({
            where: { id: decoded.id },
            include: Barang
        });
        if (!userCart) throw 'Pengguna tidak ditemukan!';
        
        const { Barangs } = userCart;
        // const barang = await Barang.findAll({

        // });

        let totalPriceItem = 0;
        for(let item in Barangs) {
            totalPriceItem += Barangs[item].harga * Barangs[item].Keranjang.jumlah;
        }
        console.log('total price item: ' + typeof(totalPriceItem));
        let totalAll = totalPriceItem + parseFloat(biayaPengiriman);
        console.log('total all: ' + typeof(totalAll));
        //const today = new Date();
        const oneDay = 86400000;

        const buatPesanan = await BuktiPembayaranPemesanan.create({
            buktiPembayaran: null,
            Pemesanan: {
                akunId: userCart.id,
                alamatTujuan,
                jasaPengiriman,
                biayaPengiriman,
                // Barang: [],
                totalHargaBarang: totalPriceItem,
                totalBiayaYangHarusDibayar: totalAll,
                pembayaranLunas: false,
                tanggalMulaiMenungguPembayaran: Date.now(),
            }
        }, {
            include: Pemesanan
        });

        // Memasukkan data barang yang dipesan dari Barangs ke dalam array untuk sementara
        Barangs.forEach((item) => {
            dataBYD.push({
                pemesananId: buatPesanan.pemesananId,
                BarangId: item.Keranjang.BarangId,
                jumlah: item.Keranjang.jumlah,
                totalHarga: item.harga * item.Keranjang.jumlah
            });
        });
        // console.log(dataBYD);
        
        // add transaction
        // t = await sequelize.transaction();
        dataBYD.forEach(async (item) => {
            await BarangYangDipesan.create(item);
            let barang = await Barang.findOne({
                where: {
                    id: item.BarangId
                }
            });

            const stokBarang = await barang.getDataValue('stok');

            let updateStok = stokBarang - item.jumlah;
            if (updateStok < 0) throw 'Stok tidak mencukupi!';

            await barang.update({
                stok: updateStok
            });
        });
        // await t.commit();

        await Keranjang.destroy({
            where: {
                akunId: decoded.id
            }
        });

        waktuPembayaran = setTimeout(async() => {
            console.log("waktu habis, pemesanan dibatalkan!");
            
            dataBYD.forEach(async (item) => {
                let barang = await Barang.findOne({
                    where: {
                        id: item.BarangId
                    }
                });

                const stokBarang = await barang.getDataValue('stok');
                let updateStok = stokBarang + item.jumlah;

                await barang.update({
                    stok: updateStok
                });

                await BarangYangDipesan.destroy({
                    where: {
                        pemesananId: item.pemesananId,
                        BarangId: item.BarangId
                    }
                });
            });

            await buatPesanan.destroy();
            // await BarangYangDipesan.destroy({

            // });
            // await Keranjang.destroy({
            //     where: {
            //         akunId: decoded.id
            //     }
            // });
            // set ulang array menjadi nol
            dataBYD = [];
        }, 50000);
        
        res.status(200).json({
            status: "success",
            message: 'Pesanan telah dibuat, menunggu pembayaran hingga 24 jam kedepan!',
            data: {
                Keranjang: userCart,
                Pesanan: buatPesanan,
                totalHarga: totalPriceItem,
                statusPesanan: 'Bayar',
            }
        }).end();

    }
    catch(err) {
        console.log(err);
        res.status(500).json({
            status: 'fail',
            message: [err]
        }).end();
    }
};

 const pesananBelumBayar = async (req, res) => {
    const logged = req.cookies.logged_account;
    const decoded = jwt.verify(logged, 'jwtAkunId');

    try {
        
    }
    catch (err) {

    }
 };

const uploadBuktiBayar = async (req, res) => {
    const logged = req.cookies.logged_account;
    // decode cookie's token from jwt to get the id of Akun
    const decoded = jwt.verify(logged, 'jwtAkunId');
    const { id } = req.params;
    let imagePath = req.file.path;

    try {
        const userCart = await Akun.findOne({
            where: { id: decoded.id },
            include: Barang
        });
        if (!userCart) throw 'Pengguna tidak ditemukan!';

        const buktiBayar = await BuktiPembayaranPemesanan.findOne({
            where: {
                pemesananId: id
            }
        },
        {
            include: Pemesanan
        });

        await buktiBayar.update({
            buktiPembayaran: imagePath
        });
        await Keranjang.destroy({
            where: {
                akunId: decoded.id
            }
        });

        clearTimeout(waktuPembayaran);

        res
        .status(200)
        .json({
            status: 'success',
            message: 'Berhasil mengupload bukti pembayaran!',
            statusPesanan: ['Semua', 'Menunggu konfirmasi'],
            data: buktiBayar
        })
        .end();
    }
    catch(err) {
        console.log(err);
        res
        .status(500)
        .json({
            status: 'fail',
            message: [err]
        })
        .end();
    }
};

const daftarSemuaPesanan = async (req, res) => {
    const logged = req.cookies.logged_account;
    const decoded = jwt.verify(logged, 'jwtAkunId');

    try {
        const listPesanan = await BuktiPembayaranPemesanan.findAll({
            include: Pemesanan
        },
        {
            where: {
                Pemesanan: {
                    akunId: decoded.id
                }
            }
        });

        console.log(listPesanan);
        res
        .status(200)
        .json({
            status: 'success',
            data: {
                pesanan: listPesanan,
                statusPesanan: 'Semua'
            }
        })
        .end();
    }
    catch (err) {
        console.log(err);
        res
        .status(500)
        .json({
            status: 'fail',
            message: [err]
        })
        .end();
    }
};

const umpanBalik = async (req, res) => {
    const { id } = req.params;
    const {
        rating,
        testimoni
    } = req.body;

    try {
        const pesanan = await BuktiPembayaranPemesanan.findOne({
            where: {
                pemesananId: id
            }
        },
        {
            include: Pemesanan
        });

        await pesanan.update({
            Pemesanan: {
                rating: parseFloat(rating),
                testimoni: testimoni
            }
        });

        res
        .status(200)
        .json({
            status: 'success',
            message: 'Berhasil menambahkan ulasan!',
            data: {
                pesanan: pesanan,
                statusPesanan: 'Selesai'
            }
        })
    }
    catch (err) {
        console.log(err);
        res
        .status(500)
        .json({
            status: 'fail',
            message: [err]
        })
        .end();
    }
};

// untuk testing
const byd = async (req, res) => {
    const logged = req.cookies.logged_account;
    const decoded = jwt.verify(logged, 'jwtAkunId');
    const { pmsID } = req.params;

    try {
        const BYD = await BarangYangDipesan.findAll({
            where: {
                pemesananId: pmsID
            }
        });

        res
        .status(200)
        .json({
            status: 'success',
            data: BYD
        })
        .end();
    }
    catch (err) {
        console.log(err);res
        .status(500)
        .json({
            status: 'fail',
            message: [err]
        })
        .end();
    }
};



// ADMIN ONLY
const daftarKonfirmasiPesanan = async (req, res) => {
    try {
        const waitForConfirm = await BuktiPembayaranPemesanan.findAll({
            where: {
                buktiPembayaran: {
                    [Op.not]: null
                }   
            },
            include: {
                model: Pemesanan,
                where: {
                    pembayaranLunas: false
                }
            },
        });

        res
        .status(200)
        .json({
            status: 'success',
            data: waitForConfirm
        }).end();
    }
    catch (err) {
        console.log(err);
        res
        .status(500)
        .json({
            status: 'fail',
            message: [err]
        })
        .end();
    }
};

const konfirmasiPesanan = async (req, res) => {
    const { id } = req.params;

    try {
        const pesanan = await BuktiPembayaranPemesanan.findOne({
            where: {
                pemesananId: id
            },
            include: Pemesanan
        });

        await pesanan['Pemesanan'].update({
                pembayaranLunas: true
        });
        await pesanan.save();

        res
        .status(200)
        .json({
            status: 'success',
            message: 'Pembayaran berhasil dikonfirmasi!',
            data: {
                pesanan: pesanan,
                statusPesanan: 'Diproses'
            }
        })
        .end();
    }
    catch (err) {
        console.log(err);
        res
        .status(500)
        .json({
            status: 'fail',
            message: [err]
        })
        .end();
    }
};

const batalkanPesanan = async (req, res) => {
    const { id } = req.params;

    try {
        const pesanan = await BuktiPembayaranPemesanan.findOne({
            where: {
                pemesananId: id
            }
        },
        {
            include: Pemesanan
        });

        // delete photo from local storage
        fs.unlink(`${pesanan.buktiPembayaran}`, (err) => {
            if (err) throw 'Gagal menghapus foto dari penyimpanan lokal!';
            else console.log('Berhasil menghapus foto dari penyimpanan lokal!');
        });
        
        // -----------------------------
        // hapus dari db
        dataBYD.forEach(async (item) => {
            let barang = await Barang.findOne({
                where: {
                    id: item.BarangId
                }
            });

            const stokBarang = await barang.getDataValue('stok');
            let updateStok = stokBarang + item.jumlah;

            await barang.update({
                stok: updateStok
            });

            await BarangYangDipesan.destroy({
                where: {
                    pemesananId: item.pemesananId,
                    BarangId: item.BarangId
                }
            });
        });

        await pesanan.destroy();
        dataBYD = [];
        // --------------------------------

        res
        .status(200)
        .json({
            status: 'success',
            message: 'Pesanan berhasil dibatalkan!'
        })
        .end();
    }
    catch (err) {
        console.log(err);
        res
        .status(500)
        .json({
            status: 'fail',
            message: [err]
        })
        .end();
    }
};

const  ubahStatusKirim = async (req, res) => {
    const { id } = req.params;

    try {
        const pesanan = await BuktiPembayaranPemesanan.findOne({
            where: {
                pemesananId: id
            }
        },
        {
            include: Pemesanan
        });
        
        await pesanan.update({
            Pemesanan: {
                tanggalKirim: Date.now()
            }
        });

        res
        .status(200)
        .json({
            status: 'success',
            message: 'Pesanan berhasil dibatalkan!'
        })
        .end();
    }
    catch (err) {
        console.log(err);
        res
        .status(500)
        .json({
            status: 'fail',
            message: [err]
        })
        .end();
    }
};


module.exports = {
    checkout,
    pesananBelumBayar,
    uploadBuktiBayar,
    daftarSemuaPesanan,
    umpanBalik,
    byd, // testing barang yang dipesan

    // ADMIN ONLY
    daftarKonfirmasiPesanan,
    konfirmasiPesanan,
    batalkanPesanan,
    ubahStatusKirim
};
