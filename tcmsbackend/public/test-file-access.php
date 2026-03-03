<?php
$file = '../storage/app/public/study_materials/1771920693_Manual Pengguna MyTRUSTID_v2.pdf';
echo "File path: " . $file . "<br>";
echo "File exists: " . (file_exists($file) ? 'Yes' : 'No') . "<br>";
echo "Is readable: " . (is_readable($file) ? 'Yes' : 'No') . "<br>";
echo "File permissions: " . substr(sprintf('%o', fileperms($file)), -4) . "<br>";
echo "Real path: " . realpath($file) . "<br>";

// Try to output file
if (is_readable($file)) {
    header('Content-Type: application/pdf');
    readfile($file);
} else {
    echo "Cannot read file";
}
?>