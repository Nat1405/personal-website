The idea: how could I establish a cloud database and build an android application to write data to that server?

## Part 1: Deploying a LAMP Web Server with CRUD abilities.

This made extensive use of AWS EC2 and Docker.


## Set up LAMP Server using EC2

My first step was to set up a LAMP web server using Amazon EC2.

I found [this digital ocean guide](https://www.digitalocean.com/community/tutorials/how-to-install-linux-apache-mysql-php-lamp-stack-ubuntu-18-04) extremely useful.

I then made the effort to dockerize my setup (because I don't think I can afford to run an EC2 instance all the time and needed to be able to launch quickly).

First I figured installed docker and docker compose on my ec2 instance with help from the [docker documentation](https://docs.docker.com/install/linux/docker-ce/ubuntu/).

*Note that we might have to change the version number of docker-compose in the curl command below. Find the latest version number by going to the [release page](https://github.com/docker/compose/releases) on Github.*

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
sudo apt-get update
sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg-agent \
    software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo apt-key fingerprint 0EBFCD88
sudo add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io
sudo docker run hello-world
sudo curl -L https://github.com/docker/compose/releases/download/1.24.0-rc1/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

I then started building a docker LAMP image, just to learn how it's done. This [kinamo](https://www.kinamo.be/en/support/faq/setting-up-a-development-environment-with-docker-compose) guide was super helpful.

```bash
mkdir php
cd php
echo "FROM php:5.6-apache

RUN docker-php-ext-install mysqli" > Dockerfile

mkdir www
cd www
echo "<?php
phpinfo();
?>" > index.php

cd ../../

echo "version: '2'

services:
  php:
    build: php
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./php/www:/var/www/html
    links:
      - db
  db:
    image: mysql:5.7
    volumes:
     - /var/lib/mysql
    environment:
     - MYSQL_ROOT_PASSWORD=thisismypassword
     - MYSQL_DATABASE=culturemind

      " > docker-compose.yml

echo "<?php

mysqli_connect(\"db\", \"root\", \"thisismypassword\", \"culturemind\") or die(mysqli_error());
echo \"Connected to MySQL<br />\";

?>" > php/www/index.php

sudo docker-compose up -d

```

You should now have a dockerized LAMP server up and running!


## Create a Basic Database

I found some inspiration from [here](http://www.androidhive.info/2012/05/how-to-connect-android-with-php-mysql/).

First we write some php to create the table. We'll use a connection class to connect to the database.

Place the contents of the following in php/www/db_config.php on the host machine.

```php
<?php
 
/*
 * All database connection variables
 */
 
define('DB_USER', "root"); // db user
define('DB_PASSWORD', "thisismypassword"); // db password (mention your db password here)
define('DB_DATABASE', "culturemind"); // database name
define('DB_SERVER', "db"); // db server
?>
```


Now we'll try to create the table. Place the following in php/www/table_create.php

```php
<?php

// Create the initial table in our database

// array for JSON response
$response = array();

require_once __DIR__ . '/db_config.php';

// Create connection
$link = mysqli_connect(DB_SERVER, DB_USER, DB_PASSWORD, DB_DATABASE);
// Check connection
if ($link->connect_error) {
    die("Connection failed: " . $link->connect_error);
}

// sql to create table
$sql = "CREATE TABLE data(
pid int(11) primary key auto_increment,
name varchar(100) not null,
price decimal(10,2) not null,
description text,
created_at timestamp default now(),
updated_at timestamp default now()
)";

if ($link->query($sql) === TRUE) {
    echo "Table data created successfully";
} else {
    echo "Error creating table: " . $link->error;
}

mysqli_close($link);
?>
```

Now to add rows to the table. Add the following to php/www/create_product.php

```php
<?php

/*
 * Following code will create a new product row
 * All product details are read from HTTP Post Request
 */

// array for JSON response
$response = array();

// check for required fields
if (isset($_POST['name']) && isset($_POST['price']) && isset($_POST['description'])) {

    $name = $_POST['name'];
    $price = $_POST['price'];
    $description = $_POST['description'];

    // include db connect class
    require_once __DIR__ . '/db_config.php';

    // connecting to db
    $link = mysqli_connect(DB_SERVER, DB_USER, DB_PASSWORD, DB_DATABASE);
        // Check connection
        if ($link->connect_error) {
            die("Connection failed: " . $link->connect_error);
        }

        $sql = "INSERT INTO data(name, price, description) VALUES('$name', '$price', '$description')";

    // mysql inserting a new row
    // check if row inserted or not
    if (($link->query($sql)) === TRUE) {
        // successfully inserted into database
        $response["success"] = 1;
        $response["message"] = "Product successfully created.";

        // echoing JSON response
        echo json_encode($response);
    } else {
        // failed to insert row
        $response["success"] = 0;
        $response["message"] = "Oops! An error occurred.";

        // echoing JSON response
        echo json_encode($response);
    }

} else {
    // required field is missing
    $response["success"] = 0;
    $response["message"] = "Required field(s) is missing";

    // echoing JSON response
    echo json_encode($response);
}
?>
```

Now we'll get product details. Add the following to php/www/get_product_details.php

```php
<?php
 
/*
 * Following code will get single product details
 * A product is identified by product id (pid)
 */
 
// array for JSON response
$response = array();
 
// include db connect class
require_once __DIR__ . '/db_config.php';
 
// connecting to db
$link = mysqli_connect(DB_SERVER, DB_USER, DB_PASSWORD, DB_DATABASE);
// Check connection
if ($link->connect_error) {
    die("Connection failed: " . $link->connect_error);
}
 
// check for post data
if (isset($_GET["pid"])) {
    $pid = $_GET['pid'];
 
    $sql = "SELECT *FROM products WHERE pid = $pid";

    // get a product from products table
 	$result = mysqli_query($link, $sql);
    if (!empty($result)) {
        // check for empty result
        if (mysqli_num_rows($result) > 0) {
 
            $result = mysql_fetch_array($result);
 
            $product = array();
            $product["pid"] = $result["pid"];
            $product["name"] = $result["name"];
            $product["price"] = $result["price"];
            $product["description"] = $result["description"];
            $product["created_at"] = $result["created_at"];
            $product["updated_at"] = $result["updated_at"];
            // success
            $response["success"] = 1;
 
            // user node
            $response["product"] = array();
 
            array_push($response["product"], $product);
 
            // echoing JSON response
            echo json_encode($response);
        } else {
            // no product found
            $response["success"] = 0;
            $response["message"] = "No product found";
 
            // echo no users JSON
            echo json_encode($response);
        }
    } else {
        // no product found
        $response["success"] = 0;
        $response["message"] = "No product found";
 
        // echo no users JSON
        echo json_encode($response);
    }
} else {
    // required field is missing
    $response["success"] = 0;
    $response["message"] = "Required field(s) is missing";
 
    // echoing JSON response
    echo json_encode($response);
}
?>
```

Let's view all rows in the database. Add this to php/www/get_all_products.php.

```php
<?php
 
/*
 * Following code will list all the products
 */
 
// array for JSON response
$response = array();
 
// include db connect class
require_once __DIR__ . '/db_config.php';
 
// connecting to db
$link = mysqli_connect(DB_SERVER, DB_USER, DB_PASSWORD, DB_DATABASE);
// Check connection
if ($link->connect_error) {
    die("Connection failed: " . $link->connect_error);
}
 
// get all products from products table
$sql = "SELECT * FROM data";
$result = mysqli_query($link, $sql);
echo "$result";
 
// check for empty result
if (!empty(result)){
	if (mysqli_num_rows($result) > 0) {
	    // looping through all results
	    // products node
	    $response["products"] = array();
	 
	    while ($row = mysqli_fetch_array($result, MYSQLI_BOTH)) {
	        // temp user array
	        $product = array();
	        $product["pid"] = $row["pid"];
	        $product["name"] = $row["name"];
	        $product["price"] = $row["price"];
	        $product["created_at"] = $row["created_at"];
	        $product["updated_at"] = $row["updated_at"];
	 
	        // push single product into final response array
	        array_push($response["products"], $product);
	    }
	    // success
	    $response["success"] = 1;
	 
	    // echoing JSON response
	    echo json_encode($response);
	} else {
	    // no products found
	    $response["success"] = 0;
	    $response["message"] = "No products found";
	 
	    // echo no users JSON
	    echo json_encode($response);
	}
} else {
	$response["success"] = 0;
	$response["message"] = "Database was empty.";
	echo json_encode($response);
}
?>
```

Let's add code to update a product. Add this to php/www/update_product.php.

```php
<?php
 
/*
 * Following code will update a product information
 * A product is identified by product id (pid)
 */
 
// array for JSON response
$response = array();
 
// check for required fields
if (isset($_POST['pid']) && isset($_POST['name']) && isset($_POST['price']) && isset($_POST['description'])) {
 
    $pid = $_POST['pid'];
    $name = $_POST['name'];
    $price = $_POST['price'];
    $description = $_POST['description'];
 
    // include db connect class
	require_once __DIR__ . '/db_config.php';
	 
	// connecting to db
	$link = mysqli_connect(DB_SERVER, DB_USER, DB_PASSWORD, DB_DATABASE);
	// Check connection
	if ($link->connect_error) {
	    die("Connection failed: " . $link->connect_error);
	}

	$sql = "UPDATE data SET name = '$name', price = '$price', description = '$description' WHERE pid = $pid";
 
    // mysql update row with matched pid
    $result = mysqli_query($link, $sql);
 
    // check if row inserted or not
    if ($result) {
        // successfully updated
        $response["success"] = 1;
        $response["message"] = "Product successfully updated.";
 
        // echoing JSON response
        echo json_encode($response);
    } else {
 		$response["success"] = 0;
        $response["message"] = "Error updating row.";
    }
} else {
    // required field is missing
    $response["success"] = 0;
    $response["message"] = "Required field(s) is missing";
 
    // echoing JSON response
    echo json_encode($response);
}
?>
```

Lastly, let's set up a delete operation. Add the following to php/www/delete_product.php

```php
<?php
 
/*
 * Following code will delete a product from table
 * A product is identified by product id (pid)
 */
 
// array for JSON response
$response = array();
 
// check for required fields
if (isset($_POST['pid'])) {
    $pid = $_POST['pid'];
 
    // include db connect class
	require_once __DIR__ . '/db_config.php';
	 
	// connecting to db
	$link = mysqli_connect(DB_SERVER, DB_USER, DB_PASSWORD, DB_DATABASE);
	// Check connection
	if ($link->connect_error) {
	    die("Connection failed: " . $link->connect_error);
	}

	$sql = "DELETE FROM data WHERE pid = $pid";
 
    // mysql update row with matched pid
    $result = mysqli_query($link, $sql);
 
    // check if row deleted or not
    if ((mysqli_affected_rows($link)) > 0) {
        // successfully updated
        $response["success"] = 1;
        $response["message"] = "Product successfully deleted";
 
        // echoing JSON response
        echo json_encode($response);
    } else {
        // no product found
        $response["success"] = 0;
        $response["message"] = "No product found";
 
        // echo no users JSON
        echo json_encode($response);
    }
} else {
    // required field is missing
    $response["success"] = 0;
    $response["message"] = "Required field(s) is missing";
 
    // echoing JSON response
    echo json_encode($response);
}
?>
```

And our CRUD api is good to go! At this point I found it super useful to use [postman](https://www.getpostman.com) to send POST and GET requests to help debugging.

More coming soon!

